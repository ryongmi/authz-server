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
      .select('rp.permissionId')
      .where('rp.roleId = :roleId', { roleId })
      .getRawMany();
    
    return result.map(row => row.rp_permissionId);
  }

  /**
   * 권한별 역할 ID 목록 조회 (최적화된 쿼리)
   */
  async findRoleIdsByPermissionId(permissionId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('rp')
      .select('rp.roleId')
      .where('rp.permissionId = :permissionId', { permissionId })
      .getRawMany();
    
    return result.map(row => row.rp_roleId);
  }

  /**
   * 여러 역할의 권한 ID 목록 조회 (배치 처리)
   */
  async findPermissionIdsByRoleIds(roleIds: string[]): Promise<Map<string, string[]>> {
    const result = await this.createQueryBuilder('rp')
      .select(['rp.roleId', 'rp.permissionId'])
      .where('rp.roleId IN (:...roleIds)', { roleIds })
      .getRawMany();
    
    const rolePermissionMap = new Map<string, string[]>();
    
    result.forEach(row => {
      const roleId = row.rp_roleId;
      const permissionId = row.rp_permissionId;
      
      if (!rolePermissionMap.has(roleId)) {
        rolePermissionMap.set(roleId, []);
      }
      rolePermissionMap.get(roleId)!.push(permissionId);
    });
    
    return rolePermissionMap;
  }

  /**
   * 역할-권한 관계 존재 확인
   */
  async existsRolePermission(roleId: string, permissionId: string): Promise<boolean> {
    const count = await this.createQueryBuilder('rp')
      .where('rp.roleId = :roleId AND rp.permissionId = :permissionId', { roleId, permissionId })
      .getCount();
    
    return count > 0;
  }
}