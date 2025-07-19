import { Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm';

import { BaseRepository } from '@krgeobuk/core/repositories';

import { RolePermissionEntity } from './entities/role-permission.entity.js';

@Injectable()
export class RolePermissionRepository extends BaseRepository<RolePermissionEntity> {
  constructor(private dataSource: DataSource) {
    super(RolePermissionEntity, dataSource);
  }

  /**
   * 역할별 권한 ID 목록 조회 (최적화된 쿼리)
   */
  async findPermissionIdsByRoleId(roleId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('rp')
      .select('rp.permission_id AS permissionId')
      .where('rp.role_id = :roleId', { roleId })
      .getRawMany();

    return result.map((row) => row.permissionId);
  }

  /**
   * 권한별 역할 ID 목록 조회 (최적화된 쿼리)
   */
  async findRoleIdsByPermissionId(permissionId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('rp')
      .select('rp.role_id AS roleId')
      .where('rp.permission_id = :permissionId', { permissionId })
      .getRawMany();

    return result.map((row) => row.roleId);
  }

  /**
   * 여러 역할의 권한 ID 목록 조회 (배치 처리)
   */
  async findPermissionIdsByRoleIds(roleIds: string[]): Promise<Record<string, string[]>> {
    const result = await this.createQueryBuilder('rp')
      .select(['rp.role_id AS roleId', 'rp.permission_id AS permissionId'])
      .where('rp.role_id IN (:...roleIds)', { roleIds })
      .getRawMany();

    const rolePermissionMap: Record<string, string[]> = {};

    result.forEach((row) => {
      const roleId = row.roleId;
      const permissionId = row.permissionId;

      if (!rolePermissionMap[roleId]) {
        rolePermissionMap[roleId] = [];
      }
      rolePermissionMap[roleId].push(permissionId);
    });

    return rolePermissionMap;
  }

  /**
   * 여러 권한의 역할 ID 목록 조회 (배치 처리)
   */
  async findRoleIdsByPermissionIds(permissionIds: string[]): Promise<Record<string, string[]>> {
    const result = await this.createQueryBuilder('rp')
      .select(['rp.permission_id AS permissionId', 'rp.role_id AS roleId'])
      .where('rp.permission_id IN (:...permissionIds)', { permissionIds })
      .getRawMany();

    const permissionRoleMap: Record<string, string[]> = {};

    result.forEach((row) => {
      const permissionId = row.permissionId;
      const roleId = row.roleId;

      if (!permissionRoleMap[permissionId]) {
        permissionRoleMap[permissionId] = [];
      }
      permissionRoleMap[permissionId].push(roleId);
    });

    return permissionRoleMap;
  }

  /**
   * 역할-권한 관계 존재 확인 (최적화된 쿼리)
   */
  async existsRolePermission(roleId: string, permissionId: string): Promise<boolean> {
    const result = await this.createQueryBuilder('rp')
      .select('1')
      .where('rp.role_id = :roleId AND rp.permission_id = :permissionId', { roleId, permissionId })
      .limit(1)
      .getRawOne();

    return !!result;
  }
}
