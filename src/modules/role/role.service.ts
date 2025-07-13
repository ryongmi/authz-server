import { Injectable, HttpException, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { EntityManager, FindOptionsWhere, In, UpdateResult, Not } from 'typeorm';
import { firstValueFrom } from 'rxjs';

import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import type { User } from '@krgeobuk/shared/user';
import type { Service } from '@krgeobuk/shared/service';
import { RoleException } from '@krgeobuk/role/exception';
import type {
  RoleSearchQuery,
  RoleSearchResult,
  RoleDetail,
  RoleFilter,
} from '@krgeobuk/role/interfaces';

// UserRoleService는 실제 구현에 따라 필요할 수 있음
import { UserRoleService } from '@modules/user-role/index.js';

import { RoleEntity } from './entities/role.entity.js';
import { RoleRepository } from './role.repository.js';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly userRoleService: UserRoleService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('PORTAL_SERVICE') private readonly portalClient: ClientProxy
  ) {}

  // ==================== PUBLIC METHODS ====================

  async findById(roleId: string): Promise<RoleEntity | null> {
    return this.roleRepo.findOneById(roleId);
  }

  async findByIdOrFail(roleId: string): Promise<RoleEntity> {
    const role = await this.roleRepo.findOneById(roleId);

    if (!role) {
      this.logger.debug('Role not found', { roleId });
      throw RoleException.roleNotFound();
    }

    return role;
  }

  async findByServiceIds(serviceIds: string[]): Promise<RoleEntity[]> {
    return this.roleRepo.find({ where: { serviceId: In(serviceIds) } });
  }

  async findByAnd(filter: RoleFilter = {}): Promise<RoleEntity[]> {
    const where: FindOptionsWhere<RoleEntity> = {};

    if (filter.name) where.name = filter.name;
    if (filter.description) where.description = filter.description;
    if (filter.priority) where.priority = filter.priority;
    if (filter.serviceId) where.serviceId = filter.serviceId;

    // ✅ 필터 없으면 전체 조회
    if (Object.keys(where).length === 0) {
      return this.roleRepo.find(); // 조건 없이 전체 조회
    }

    return this.roleRepo.find({ where });
  }

  async findByOr(filter: RoleFilter = {}): Promise<RoleEntity[]> {
    const { name, description, priority, serviceId } = filter;

    const where: FindOptionsWhere<RoleEntity>[] = [];

    if (name) where.push({ name });
    if (description) where.push({ description });
    if (priority) where.push({ priority });
    if (serviceId) where.push({ serviceId });

    // ✅ 필터 없으면 전체 조회
    if (where.length === 0) {
      return this.roleRepo.find(); // 조건 없이 전체 조회
    }

    return this.roleRepo.find({ where });
  }

  async getRoleById(roleId: string): Promise<RoleDetail> {
    const role = await this.findByIdOrFail(roleId);

    try {
      const [service, users] = await Promise.all([
        this.getServiceById(role.serviceId),
        this.getUsersByRoleId(roleId),
      ]);

      return {
        id: role.id,
        name: role.name,
        description: role.description!,
        priority: role.priority!,
        service,
        users,
      };
    } catch (error: unknown) {
      this.logger.warn('Failed to enrich role with external data, returning basic info', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
        serviceId: role.serviceId,
      });

      return {
        id: role.id,
        name: role.name,
        description: role.description!,
        priority: role.priority!,
        service: { id: '', name: 'Service unavailable' },
        users: [],
      };
    }
  }

  async searchRoles(query: RoleSearchQuery): Promise<PaginatedResult<RoleSearchResult>> {
    const roles = await this.roleRepo.searchRoles(query);

    if (roles.items.length === 0) {
      return { items: [], pageInfo: roles.pageInfo };
    }

    const roleIds = roles.items.map((role) => role.id!);

    try {
      const [userRolesMap, services] = await Promise.all([
        this.getUserRolesByRoleIds(roleIds),
        this.getServicesByQuery(query, roles.items),
      ]);

      const items = this.buildRoleSearchResults(roles.items, userRolesMap, services);

      return {
        items,
        pageInfo: roles.pageInfo,
      };
    } catch (error: unknown) {
      this.logger.warn('TCP service communication failed, using fallback data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: query.serviceId,
        roleCount: roles.items.length,
      });

      const items = this.buildFallbackRoleSearchResults(roles.items);
      return {
        items,
        pageInfo: roles.pageInfo,
      };
    }
  }

  async createRole(attrs: Partial<RoleEntity>, transactionManager?: EntityManager): Promise<void> {
    try {
      // 중복 역할명 사전 체크
      if (attrs.name && attrs.serviceId) {
        const existingRole = await this.roleRepo.findOne({
          where: { name: attrs.name, serviceId: attrs.serviceId },
        });

        if (existingRole) {
          this.logger.warn('Role creation failed: duplicate name in service', {
            name: attrs.name,
            serviceId: attrs.serviceId,
          });
          throw RoleException.roleAlreadyExists();
        }
      }

      const roleEntity = new RoleEntity();
      Object.assign(roleEntity, attrs);

      await this.roleRepo.saveEntity(roleEntity, transactionManager);

      this.logger.log('Role created successfully', {
        name: attrs.name,
        serviceId: attrs.serviceId,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error; // 이미 처리된 예외는 그대로 전파
      }

      this.logger.error('Role creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: attrs.name,
        serviceId: attrs.serviceId,
      });

      // 데이터베이스 제약조건 위반 등의 에러
      throw RoleException.roleCreateError();
    }
  }

  async updateRole(
    roleId: string,
    attrs: Partial<RoleEntity>,
    transactionManager?: EntityManager
  ): Promise<void> {
    try {
      const role = await this.roleRepo.findOneById(roleId);

      if (!role) {
        this.logger.warn('Role update failed: role not found', { roleId });
        throw RoleException.roleNotFound();
      }

      // 이름 변경 시 중복 체크
      if (attrs.name && attrs.name !== role.name) {
        const existingRole = await this.roleRepo.findOne({
          where: {
            name: attrs.name,
            serviceId: role.serviceId,
            id: Not(roleId), // 현재 역할 제외
          },
        });

        if (existingRole) {
          this.logger.warn('Role update failed: duplicate name in service', {
            roleId,
            newName: attrs.name,
            serviceId: role.serviceId,
          });
          throw RoleException.roleAlreadyExists();
        }
      }

      Object.assign(role, attrs);
      await this.roleRepo.updateEntity(role, transactionManager);

      this.logger.log('Role updated successfully', {
        roleId,
        updatedFields: Object.keys(attrs),
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error; // 이미 처리된 예외는 그대로 전파
      }

      this.logger.error('Role update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
        attrs,
      });

      throw RoleException.roleUpdateError();
    }
  }

  async deleteRole(roleId: string): Promise<UpdateResult> {
    try {
      // 역할 존재 여부 확인
      const role = await this.findByIdOrFail(roleId);

      // 역할에 할당된 사용자가 있는지 확인
      const userIds = await this.userRoleService.getUserIds(roleId);
      if (userIds.length > 0) {
        this.logger.warn('Role deletion failed: role has assigned users', {
          roleId,
          roleName: role.name,
          assignedUsers: userIds.length,
        });
        throw RoleException.roleDeleteError(); // 할당된 사용자가 있어서 삭제 불가
      }

      const result = await this.roleRepo.softDelete(roleId);

      this.logger.log('Role deleted successfully', {
        roleId,
        roleName: role.name,
      });

      return result;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error; // 이미 처리된 예외는 그대로 전파
      }

      this.logger.error('Role deletion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
      });

      throw RoleException.roleDeleteError();
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async getUserRolesByRoleIds(roleIds: string[]): Promise<Map<string, string[]>> {
    return this.userRoleService.getUserIdsBatch(roleIds);
  }

  private async getServicesByQuery(
    query: RoleSearchQuery,
    roles: Partial<RoleEntity>[]
  ): Promise<Service | Service[]> {
    const hasServiceIdFilter = !!query.serviceId;
    const serviceIds = query.serviceId ?? roles.map((role) => role.serviceId!);

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

  private buildRoleSearchResults(
    roles: Partial<RoleEntity>[],
    userRolesMap: Map<string, string[]>,
    services: Service | Service[]
  ): RoleSearchResult[] {
    return roles.map((role) => {
      const service =
        services instanceof Array
          ? (services.find((s) => s.id === role.serviceId) ?? { id: '', name: 'Unknown Service' })
          : services;

      const userCount = userRolesMap.get(role.id!) ? userRolesMap.get(role.id!)!.length : 0;

      return {
        id: role.id!,
        name: role.name!,
        description: role.description!,
        priority: role.priority!,
        userCount,
        service,
      };
    });
  }

  private buildFallbackRoleSearchResults(roles: Partial<RoleEntity>[]): RoleSearchResult[] {
    return roles.map((role) => ({
      id: role.id!,
      name: role.name!,
      description: role.description!,
      priority: role.priority!,
      userCount: 0,
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

  private async getUsersByRoleId(roleId: string): Promise<User[]> {
    const userIds = await this.userRoleService.getUserIds(roleId);

    if (userIds.length === 0) {
      return [];
    }

    try {
      return await firstValueFrom(this.authClient.send<User[]>('user.findByIds', { userIds }));
    } catch (error: unknown) {
      this.logger.warn('Failed to fetch users from auth service, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userIds,
        roleId,
      });

      // 폴백 처리: 빈 배열 반환
      return [];
    }
  }
}
