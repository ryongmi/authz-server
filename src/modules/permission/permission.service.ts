import { Injectable } from '@nestjs/common';

import { EntityManager, FindOptionsWhere, In, UpdateResult } from 'typeorm';

// import type { PaginatedResult } from '@krgeobuk/core/interfaces';
// import type { ListQuery } from '@krgeobuk/user/interfaces';

import { PermissionEntity } from './entities/permission.entity.js';
import { PermissionRepository } from './permission.repository.js';

interface PermissionFilter {
  action?: string;
  description?: string;
  serviceId?: string;
}

@Injectable()
export class PermissionService {
  constructor(
    // private readonly dataSource: DataSource,
    private readonly permissionRepo: PermissionRepository
  ) {}

  // async searchRoles(query: SearchQuery): Promise<PaginatedResult<SearchResult>> {
  //   return this.roleRepo.search(query);
  // }

  // async getRoles(query: SearchQuery): Promise<PaginatedResult<SearchResult>> {
  //   return this.roleRepo.search(query);
  // }

  async findById(id: string): Promise<PermissionEntity | null> {
    return this.permissionRepo.findOneById(id);
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

  // async getRolesWithService(): Promise<RoleWithServiceDto[]> {
  //   const [roles, services] = await Promise.all([
  //     this.roleRepo.find(), // 역할 목록
  //     this.serviceManager.find(), // 서비스 목록
  //   ]);

  //   const serviceMap = new Map(services.map((s) => [s.id, s]));

  //   return roles.map((role) => ({
  //     id: role.id,
  //     name: role.name,
  //     priority: role.priority,
  //     service: serviceMap.get(role.serviceId),
  //   }));
  // }

  async createPermission(
    attrs: Partial<PermissionEntity>,
    transactionManager?: EntityManager
  ): Promise<PermissionEntity> {
    const permissionEntity = new PermissionEntity();

    Object.assign(permissionEntity, attrs);

    return this.permissionRepo.saveEntity(permissionEntity, transactionManager);
  }

  async updatePermission(
    permissionEntity: PermissionEntity,
    transactionManager?: EntityManager
  ): Promise<UpdateResult> {
    return this.permissionRepo.updateEntity(permissionEntity, transactionManager);
  }

  async deletePermission(id: string): Promise<UpdateResult> {
    return this.permissionRepo.softDelete(id);
  }
}
