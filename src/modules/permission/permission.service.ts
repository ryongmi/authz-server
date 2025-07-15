import { Injectable, HttpException, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { EntityManager, FindOptionsWhere, In, UpdateResult, Not } from 'typeorm';
import { firstValueFrom } from 'rxjs';

import { PermissionException } from '@krgeobuk/permission/exception';
import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import type { Service } from '@krgeobuk/shared/service';
import type { Role } from '@krgeobuk/shared/role';
import type {
  PermissionSearchQuery,
  PermissionSearchResult,
  PermissionFilter,
  PermissionDetail,
  CreatePermission,
  UpdatePermission,
} from '@krgeobuk/permission/interfaces';

import { RolePermissionService } from '@modules/role-permission/index.js';
import { RoleService } from '@modules/role/index.js';

import { PermissionEntity } from './entities/permission.entity.js';
import { PermissionRepository } from './permission.repository.js';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private readonly permissionRepo: PermissionRepository,
    private readonly rolePermissionService: RolePermissionService,
    private readonly roleService: RoleService,
    @Inject('PORTAL_SERVICE') private readonly portalClient: ClientProxy
  ) {}

  // ==================== PUBLIC METHODS ====================

  async findById(permissionId: string): Promise<PermissionEntity | null> {
    return this.permissionRepo.findOneById(permissionId);
  }

  async findByIdOrFail(permissionId: string): Promise<PermissionEntity> {
    const permission = await this.permissionRepo.findOneById(permissionId);

    if (!permission) {
      this.logger.debug('Permission not found', { permissionId });
      throw PermissionException.permissionNotFound();
    }

    return permission;
  }

  async findByServiceIds(serviceIds: string[]): Promise<PermissionEntity[]> {
    return this.permissionRepo.find({ where: { serviceId: In(serviceIds) } });
  }

  async findByAnd(filter: PermissionFilter = {}): Promise<PermissionEntity[]> {
    const where: FindOptionsWhere<PermissionEntity> = {};

    if (filter.action) where.action = filter.action;
    if (filter.description) where.description = filter.description;
    if (filter.serviceId) where.serviceId = filter.serviceId;

    // ✅ 필터 없으면 전체 조회
    if (Object.keys(where).length === 0) {
      return this.permissionRepo.find(); // 조건 없이 전체 조회
    }

    return this.permissionRepo.find({ where });
  }

  async findByOr(filter: PermissionFilter = {}): Promise<PermissionEntity[]> {
    const { action, description, serviceId } = filter;

    const where: FindOptionsWhere<PermissionEntity>[] = [];

    if (action) where.push({ action });
    if (description) where.push({ description });
    if (serviceId) where.push({ serviceId });

    // ✅ 필터 없으면 전체 조회
    if (where.length === 0) {
      return this.permissionRepo.find(); // 조건 없이 전체 조회
    }

    return this.permissionRepo.find({ where });
  }

  // ==================== 검색 및 상세 조회 메서드 ====================

  async searchPermissions(
    query: PermissionSearchQuery
  ): Promise<PaginatedResult<PermissionSearchResult>> {
    const permissions = await this.permissionRepo.searchPermissions(query);

    if (permissions.items.length === 0) {
      return { items: [], pageInfo: permissions.pageInfo };
    }

    const permissionIds = permissions.items.map((permission) => permission.id!);

    try {
      const [roleCounts, services] = await Promise.all([
        this.getRoleCountsByPermissionIds(permissionIds),
        this.getServicesByQuery(query, permissions.items),
      ]);

      const items = this.buildPermissionSearchResults(permissions.items, roleCounts, services);

      return {
        items,
        pageInfo: permissions.pageInfo,
      };
    } catch (error: unknown) {
      this.logger.warn('TCP service communication failed, using fallback data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: query.serviceId,
        permissionCount: permissions.items.length,
      });

      const items = this.buildFallbackPermissionSearchResults(permissions.items);
      return {
        items,
        pageInfo: permissions.pageInfo,
      };
    }
  }

  async getPermissionById(permissionId: string): Promise<PermissionDetail> {
    const permission = await this.findByIdOrFail(permissionId);

    try {
      const [service, roles] = await Promise.all([
        this.getServiceById(permission.serviceId),
        this.getRolesByPermissionId(permissionId),
      ]);

      return {
        id: permission.id,
        action: permission.action,
        description: permission.description ?? '',
        service,
        roles,
      };
    } catch (error: unknown) {
      this.logger.warn('Failed to enrich permission with external data, returning basic info', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionId,
        serviceId: permission.serviceId,
      });

      return {
        id: permission.id,
        action: permission.action,
        description: permission.description ?? '',
        service: { id: '', name: 'Service unavailable' },
        roles: [],
      };
    }
  }

  // ==================== 변경 메서드 ====================

  async createPermission(dto: CreatePermission, transactionManager?: EntityManager): Promise<void> {
    try {
      // 중복 권한 사전 체크
      if (dto.action && dto.serviceId) {
        const existingPermission = await this.permissionRepo.findOne({
          where: { action: dto.action, serviceId: dto.serviceId },
        });

        if (existingPermission) {
          this.logger.warn('Permission creation failed: duplicate action in service', {
            action: dto.action,
            serviceId: dto.serviceId,
          });
          throw PermissionException.permissionAlreadyExists();
        }
      }

      const permissionEntity = new PermissionEntity();
      Object.assign(permissionEntity, dto);

      await this.permissionRepo.saveEntity(permissionEntity, transactionManager);

      this.logger.log('Permission created successfully', {
        permissionId: permissionEntity.id,
        action: dto.action,
        serviceId: dto.serviceId,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error; // 이미 처리된 예외는 그대로 전파
      }

      this.logger.error('Permission creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        action: dto.action,
        serviceId: dto.serviceId,
      });

      throw PermissionException.permissionCreateError();
    }
  }

  async updatePermission(
    permissionId: string,
    dto: UpdatePermission,
    transactionManager?: EntityManager
  ): Promise<void> {
    try {
      const permission = await this.permissionRepo.findOneById(permissionId);

      if (!permission) {
        this.logger.warn('Permission update failed: permission not found', { permissionId });
        throw PermissionException.permissionNotFound();
      }

      // 액션 변경 시 중복 체크
      if (dto.action && dto.action !== permission.action) {
        const existingPermission = await this.permissionRepo.findOne({
          where: {
            action: dto.action,
            serviceId: permission.serviceId,
            id: Not(permissionId), // 현재 권한 제외
          },
        });

        if (existingPermission) {
          this.logger.warn('Permission update failed: duplicate action in service', {
            permissionId: permissionId,
            newAction: dto.action,
            serviceId: permission.serviceId,
          });
          throw PermissionException.permissionAlreadyExists();
        }
      }

      Object.assign(permission, dto);
      await this.permissionRepo.updateEntity(permission, transactionManager);

      this.logger.log('Permission updated successfully', {
        permissionId,
        action: permission.action,
        updatedFields: Object.keys(dto),
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error; // 이미 처리된 예외는 그대로 전파
      }

      this.logger.error('Permission update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionId: permissionId,
        dto,
      });

      throw PermissionException.permissionUpdateError();
    }
  }

  async deletePermission(permissionId: string): Promise<UpdateResult> {
    try {
      // 권한 존재 여부 확인
      const permission = await this.findByIdOrFail(permissionId);

      // 권한에 할당된 역할이 있는지 확인
      const roleIds = await this.rolePermissionService.getRoleIds(permissionId);
      if (roleIds.length > 0) {
        this.logger.warn('Permission deletion failed: permission has assigned roles', {
          permissionId,
          action: permission.action,
          assignedRoles: roleIds.length,
        });
        throw PermissionException.permissionDeleteError();
      }

      const result = await this.permissionRepo.softDelete(permissionId);

      this.logger.log('Permission deleted successfully', {
        permissionId,
        action: permission.action,
        serviceId: permission.serviceId,
      });

      return result;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error; // 이미 처리된 예외는 그대로 전파
      }

      this.logger.error('Permission deletion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionId: permissionId,
      });

      throw PermissionException.permissionDeleteError();
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async getRoleCountsByPermissionIds(
    permissionIds: string[]
  ): Promise<Map<string, number>> {
    // 최적화: 카운트 전용 메서드 사용
    return await this.rolePermissionService.getRoleCountsBatch(permissionIds);
  }

  private async getServicesByQuery(
    query: PermissionSearchQuery,
    permissions: Partial<PermissionEntity>[]
  ): Promise<Service | Service[]> {
    const hasServiceIdFilter = !!query.serviceId;
    const serviceIds = query.serviceId ?? permissions.map((permission) => permission.serviceId!);

    const serviceMsgPattern = hasServiceIdFilter ? 'service.findById' : 'service.findByIds';
    const serviceMsgPayload = hasServiceIdFilter ? { serviceId: serviceIds } : { serviceIds };

    try {
      return await firstValueFrom(
        this.portalClient.send<Service | Service[]>(serviceMsgPattern, serviceMsgPayload)
      );
    } catch (error: unknown) {
      this.logger.warn('Failed to fetch services from portal service, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceMsgPattern,
        serviceIds: Array.isArray(serviceIds) ? serviceIds : [serviceIds],
      });

      // 폴백 처리: 기본 서비스 정보 반환
      if (hasServiceIdFilter) {
        return { id: '', name: 'Service unavailable' };
      } else {
        return Array.isArray(serviceIds)
          ? serviceIds.map((id) => ({ id, name: 'Service unavailable' }))
          : [{ id: serviceIds as string, name: 'Service unavailable' }];
      }
    }
  }

  private buildPermissionSearchResults(
    permissions: Partial<PermissionEntity>[],
    roleCounts: Map<string, number>,
    services: Service | Service[]
  ): PermissionSearchResult[] {
    return permissions.map((permission) => {
      const service =
        services instanceof Array
          ? (services.find((s) => s.id === permission.serviceId) ?? {
              id: '',
              name: 'Unknown Service',
            })
          : services;

      const roleCount = roleCounts.get(permission.id!) || 0;

      return {
        id: permission.id!,
        action: permission.action!,
        description: permission.description!,
        roleCount,
        service,
      };
    });
  }

  private buildFallbackPermissionSearchResults(
    permissions: Partial<PermissionEntity>[]
  ): PermissionSearchResult[] {
    return permissions.map((permission) => ({
      id: permission.id!,
      action: permission.action!,
      description: permission.description!,
      roleCount: 0,
      service: { id: '', name: 'Service unavailable' },
    }));
  }

  private async getServiceById(serviceId: string): Promise<Service> {
    try {
      return await firstValueFrom(
        this.portalClient.send<Service>('service.findById', { serviceId })
      );
    } catch (error: unknown) {
      this.logger.warn('Failed to fetch service from portal service, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId,
      });

      // 폴백 처리: 기본 서비스 정보 반환
      return { id: '', name: 'Service unavailable' };
    }
  }

  private async getRolesByPermissionId(permissionId: string): Promise<Role[]> {
    const roleIds = await this.rolePermissionService.getRoleIds(permissionId);

    if (roleIds.length === 0) {
      return [];
    }

    // 최적화: 배치 처리로 N+1 쿼리 해결
    const roles = await this.roleService.findByServiceIds(roleIds);

    // RoleEntity를 Role 인터페이스 형태로 변환
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description!,
      priority: role.priority!,
      serviceId: role.serviceId,
    }));
  }
}
