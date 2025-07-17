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
      .select('rp.permission_id')
      .where('rp.role_id = :roleId', { roleId })
      .getRawMany();

    return result.map((row) => row.permission_id);
  }

  /**
   * 권한별 역할 ID 목록 조회 (최적화된 쿼리)
   */
  async findRoleIdsByPermissionId(permissionId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('rp')
      .select('rp.role_id')
      .where('rp.permission_id = :permissionId', { permissionId })
      .getRawMany();

    return result.map((row) => row.role_id);
  }

  /**
   * 여러 역할의 권한 ID 목록 조회 (배치 처리)
   */
  async findPermissionIdsByRoleIds(roleIds: string[]): Promise<Map<string, string[]>> {
    const result = await this.createQueryBuilder('rp')
      .select(['rp.role_id', 'rp.permission_id'])
      .where('rp.role_id IN (:...roleIds)', { roleIds })
      .getRawMany();

    const rolePermissionMap = new Map<string, string[]>();

    result.forEach((row) => {
      const roleId = row.role_id;
      const permissionId = row.permission_id;

      if (!rolePermissionMap.has(roleId)) {
        rolePermissionMap.set(roleId, []);
      }
      rolePermissionMap.get(roleId)!.push(permissionId);
    });

    return rolePermissionMap;
  }

  /**
   * 여러 권한의 역할 ID 목록 조회 (배치 처리)
   */
  async findRoleIdsByPermissionIds(permissionIds: string[]): Promise<Map<string, string[]>> {
    const result = await this.createQueryBuilder('rp')
      .select(['rp.permission_id', 'rp.role_id'])
      .where('rp.permission_id IN (:...permissionIds)', { permissionIds })
      .getRawMany();

    const permissionRoleMap = new Map<string, string[]>();

    result.forEach((row) => {
      const permissionId = row.permission_id;
      const roleId = row.role_id;

      if (!permissionRoleMap.has(permissionId)) {
        permissionRoleMap.set(permissionId, []);
      }
      permissionRoleMap.get(permissionId)!.push(roleId);
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
