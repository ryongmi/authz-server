import { Injectable } from '@nestjs/common';

import { EntityManager, FindOptionsWhere, In, UpdateResult } from 'typeorm';

import { RolePermissionEntity } from './entities/role-permission.entity.js';
import { RolePermissionRepository } from './role-permission.repository.js';

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

  async createServiceVisibleRole(
    attrs: Partial<RolePermissionEntity>,
    transactionManager?: EntityManager
  ): Promise<RolePermissionEntity> {
    const rolePermissionEntity = new RolePermissionEntity();

    Object.assign(rolePermissionEntity, attrs);

    return this.rolePermissionRepo.saveEntity(rolePermissionEntity, transactionManager);
  }

  async updateServiceVisibleRole(
    rolePermissionEntity: RolePermissionEntity,
    transactionManager?: EntityManager
  ): Promise<UpdateResult> {
    return this.rolePermissionRepo.updateEntity(rolePermissionEntity, transactionManager);
  }

  async deleteServiceVisibleRole(id: string): Promise<UpdateResult> {
    return this.rolePermissionRepo.softDelete(id);
  }
}
