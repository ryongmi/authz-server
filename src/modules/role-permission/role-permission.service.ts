import { Injectable } from '@nestjs/common';

import { EntityManager, FindOptionsWhere, In, UpdateResult } from 'typeorm';

import type { PaginatedResult } from '@krgeobuk/core/interfaces';

import { RolePermissionEntity } from './entities/role-permission.entity.js';
import { RolePermissionRepository } from './role-permission.repository.js';
import { RolePermissionSearchQueryDto } from './dtos/role-permission-search-query.dto.js';
import { AssignRolePermissionDto } from './dtos/assign-role-permission.dto.js';

interface Filter {
  roleId?: string;
  permissionId?: string;
}

@Injectable()
export class RolePermissionService {
  constructor(
    // private readonly dataSource: DataSource,
    private readonly rolePermissionRepo: RolePermissionRepository
  ) {}

  async searchRolePermissions(query: RolePermissionSearchQueryDto): Promise<PaginatedResult<RolePermissionEntity>> {
    return this.rolePermissionRepo.searchRolePermissions(query);
  }

  async findByPermissionId(permissionId: string): Promise<RolePermissionEntity[]> {
    return this.rolePermissionRepo.find({ where: { permissionId } });
  }

  async findByRoleId(roleId: string): Promise<RolePermissionEntity[]> {
    return this.rolePermissionRepo.find({ where: { roleId } });
  }

  async findByPermissionIds(permissionIds: string[]): Promise<RolePermissionEntity[]> {
    return this.rolePermissionRepo.find({ where: { permissionId: In(permissionIds) } });
  }

  async findByRoleIds(roleIds: string[]): Promise<RolePermissionEntity[]> {
    return this.rolePermissionRepo.find({ where: { roleId: In(roleIds) } });
  }

  async findByAnd(filter: Filter = {}): Promise<RolePermissionEntity[]> {
    const where: FindOptionsWhere<RolePermissionEntity> = {};

    if (filter.permissionId) where.permissionId = filter.permissionId;
    if (filter.roleId) where.roleId = filter.roleId;

    // ✅ 필터 없으면 전체 조회
    if (Object.keys(where).length === 0) {
      return this.rolePermissionRepo.find(); // 조건 없이 전체 조회
    }

    return this.rolePermissionRepo.find({ where });
  }

  async findByOr(filter: Filter = {}): Promise<RolePermissionEntity[]> {
    const { permissionId, roleId } = filter;

    const where: FindOptionsWhere<RolePermissionEntity>[] = [];

    if (permissionId) where.push({ permissionId });
    if (roleId) where.push({ roleId });

    // ✅ 필터 없으면 전체 조회
    if (where.length === 0) {
      return this.rolePermissionRepo.find(); // 조건 없이 전체 조회
    }

    return this.rolePermissionRepo.find({ where });
  }

  async assignRolePermission(
    dto: AssignRolePermissionDto,
    transactionManager?: EntityManager
  ): Promise<RolePermissionEntity> {
    // 이미 할당된 권한인지 확인
    const existing = await this.rolePermissionRepo.findOne({
      where: { roleId: dto.roleId, permissionId: dto.permissionId }
    });

    if (existing) {
      throw new Error('Role permission already assigned');
    }

    const rolePermissionEntity = new RolePermissionEntity();
    Object.assign(rolePermissionEntity, dto);

    return this.rolePermissionRepo.saveEntity(rolePermissionEntity, transactionManager);
  }

  async removeRolePermission(
    roleId: string, 
    permissionId: string,
    transactionManager?: EntityManager
  ): Promise<void> {
    const rolePermission = await this.rolePermissionRepo.findOne({
      where: { roleId, permissionId }
    });

    if (!rolePermission) {
      throw new Error('Role permission not found');
    }

    await this.rolePermissionRepo.remove(rolePermission);
  }
}
