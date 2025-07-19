import { Injectable, HttpException, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { EntityManager, FindOptionsWhere, In, UpdateResult, Not } from 'typeorm';
import { firstValueFrom } from 'rxjs';

import { RoleException } from '@krgeobuk/role/exception';
import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import type { User } from '@krgeobuk/shared/user';
import type { Service } from '@krgeobuk/shared/service';
import type {
  RoleSearchQuery,
  RoleSearchResult,
  RoleDetail,
  RoleFilter,
  CreateRole,
  UpdateRole,
} from '@krgeobuk/role/interfaces';
import { ServiceTcpPatterns } from '@krgeobuk/service/tcp';
import { UserTcpPatterns } from '@krgeobuk/user/tcp';

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
      this.logger.debug('역할을 찾을 수 없음', { roleId });
      throw RoleException.roleNotFound();
    }

    return role;
  }

  async findByIds(roleIds: string[]): Promise<RoleEntity[]> {
    if (roleIds.length === 0) return [];

    return this.roleRepo.find({
      where: { id: In(roleIds) },
      order: { name: 'DESC' },
    });
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

  async searchRoles(query: RoleSearchQuery): Promise<PaginatedResult<RoleSearchResult>> {
    const roles = await this.roleRepo.searchRoles(query);

    if (roles.items.length === 0) {
      return { items: [], pageInfo: roles.pageInfo };
    }

    const roleIds = roles.items.map((role) => role.id!);
    const serviceIds = roles.items.map((role) => role.serviceId!);

    try {
      const [userCounts, services] = await Promise.all([
        this.getUserCountByRoleIds(roleIds),
        this.getServicesByQuery(serviceIds),
      ]);

      const items = this.buildRoleSearchResults(roles.items, userCounts, services);

      return {
        items,
        pageInfo: roles.pageInfo,
      };
    } catch (error: unknown) {
      this.logger.warn('TCP 서비스 통신 실패, 대체 데이터 사용', {
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
      this.logger.warn('외부 데이터로 역할 정보 보강 실패, 기본 정보 반환', {
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

  async createRole(dto: CreateRole, transactionManager?: EntityManager): Promise<void> {
    try {
      // 중복 역할명 사전 체크
      if (dto.name && dto.serviceId) {
        const existingRole = await this.roleRepo.findOne({
          where: { name: dto.name, serviceId: dto.serviceId },
        });

        if (existingRole) {
          this.logger.warn('역할 생성 실패: 서비스 내 중복 이름', {
            name: dto.name,
            serviceId: dto.serviceId,
          });
          throw RoleException.roleAlreadyExists();
        }
      }

      const roleEntity = new RoleEntity();
      Object.assign(roleEntity, dto);

      await this.roleRepo.saveEntity(roleEntity, transactionManager);

      this.logger.log('역할 생성 성공', {
        roleId: roleEntity.id,
        name: dto.name,
        serviceId: dto.serviceId,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error; // 이미 처리된 예외는 그대로 전파
      }

      this.logger.error('역할 생성 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: dto.name,
        serviceId: dto.serviceId,
      });

      throw RoleException.roleCreateError();
    }
  }

  async updateRole(
    roleId: string,
    dto: UpdateRole,
    transactionManager?: EntityManager
  ): Promise<void> {
    try {
      const role = await this.roleRepo.findOneById(roleId);

      if (!role) {
        this.logger.warn('역할 업데이트 실패: 역할을 찾을 수 없음', { roleId });
        throw RoleException.roleNotFound();
      }

      // 이름 변경 시 중복 체크
      if (dto.name && dto.name !== role.name) {
        const existingRole = await this.roleRepo.findOne({
          where: {
            name: dto.name,
            serviceId: role.serviceId,
            id: Not(roleId), // 현재 역할 제외
          },
        });

        if (existingRole) {
          this.logger.warn('역할 업데이트 실패: 서비스 내 중복 이름', {
            roleId,
            newName: dto.name,
            serviceId: role.serviceId,
          });
          throw RoleException.roleAlreadyExists();
        }
      }

      Object.assign(role, dto);
      await this.roleRepo.updateEntity(role, transactionManager);

      this.logger.log('역할 업데이트 성공', {
        roleId,
        name: role.name,
        updatedFields: Object.keys(dto),
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error; // 이미 처리된 예외는 그대로 전파
      }

      this.logger.error('역할 업데이트 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
        dto,
      });

      throw RoleException.roleUpdateError();
    }
  }

  async deleteRole(roleId: string): Promise<UpdateResult> {
    try {
      // 역할 존재 여부 확인
      const role = await this.findByIdOrFail(roleId);

      // 역할에 할당된 사용자가 있는지 확인 (최적화)
      const hasUsers = await this.userRoleService.hasUsersForRole(roleId);
      if (hasUsers) {
        this.logger.warn('역할 삭제 실패: 역할에 할당된 사용자가 있음', {
          roleId,
          roleName: role.name,
        });
        throw RoleException.roleDeleteError();
      }

      const result = await this.roleRepo.softDelete(roleId);

      this.logger.log('역할 삭제 성공', {
        roleId,
        roleName: role.name,
        serviceId: role.serviceId,
        deletionType: 'soft',
      });

      return result;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error; // 이미 처리된 예외는 그대로 전파
      }

      this.logger.error('역할 삭제 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
      });

      throw RoleException.roleDeleteError();
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async getUserCountByRoleIds(roleIds: string[]): Promise<Record<string, number>> {
    return await this.userRoleService.getRoleCountsBatch(roleIds);
  }

  private async getServicesByQuery(serviceIds: string[]): Promise<Service | Service[]> {
    const hasServiceIdFilter = serviceIds.length > 1;

    const serviceMsgPattern = hasServiceIdFilter
      ? ServiceTcpPatterns.FIND_BY_IDS
      : ServiceTcpPatterns.FIND_BY_ID;
    const serviceMsgPayload = hasServiceIdFilter ? { serviceIds } : { serviceId: serviceIds };

    try {
      return await firstValueFrom(
        this.portalClient.send<Service | Service[]>(serviceMsgPattern, serviceMsgPayload)
      );
    } catch (error: unknown) {
      this.logger.warn('포털 서비스에서 서비스 정보 조회 실패, 대체 데이터 사용', {
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
    userCounts: Record<string, number>,
    services: Service | Service[]
  ): RoleSearchResult[] {
    return roles.map((role) => {
      const service =
        services instanceof Array
          ? (services.find((s) => s.id === role.serviceId) ?? { id: '', name: 'Unknown Service' })
          : services;

      const userCount = userCounts[role.id!] || 0;

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
        this.portalClient.send<Service>(ServiceTcpPatterns.FIND_BY_ID, { serviceId })
      );
    } catch (error: unknown) {
      this.logger.warn('포털 서비스에서 서비스 정보 조회 실패, 대체 데이터 사용', {
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
      return await firstValueFrom(
        this.authClient.send<User[]>(UserTcpPatterns.FIND_BY_IDS, { userIds })
      );
    } catch (error: unknown) {
      this.logger.warn('인증 서비스에서 사용자 정보 조회 실패, 대체 데이터 사용', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userIds,
        roleId,
      });

      // 폴백 처리: 빈 배열 반환
      return [];
    }
  }
}
