import { Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm';

import { BaseRepository } from '@krgeobuk/core/repositories';

import { UserRoleEntity } from './entities/user-role.entity.js';

@Injectable()
export class UserRoleRepository extends BaseRepository<UserRoleEntity> {
  constructor(private dataSource: DataSource) {
    super(UserRoleEntity, dataSource);
  }

  /**
   * 사용자별 역할 ID 목록 조회 (최적화된 쿼리)
   */
  async findRoleIdsByUserId(userId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('ur')
      .select('ur.role_id')
      .where('ur.user_id = :userId', { userId })
      .getRawMany();

    return result.map((row) => row.role_id);
  }

  /**
   * 역할별 사용자 ID 목록 조회 (최적화된 쿼리)
   */
  async findUserIdsByRoleId(roleId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('ur')
      .select('ur.user_id')
      .where('ur.role_id = :roleId', { roleId })
      .getRawMany();

    return result.map((row) => row.user_id);
  }

  /**
   * 여러 사용자의 역할 ID 목록 조회 (배치 처리)
   */
  async findRoleIdsByUserIds(userIds: string[]): Promise<Map<string, string[]>> {
    const result = await this.createQueryBuilder('ur')
      .select(['ur.user_id', 'ur.role_id'])
      .where('ur.user_id IN (:...userIds)', { userIds })
      .getRawMany();

    const userRoleMap = new Map<string, string[]>();

    result.forEach((row) => {
      const userId = row.user_id;
      const roleId = row.role_id;

      if (!userRoleMap.has(userId)) {
        userRoleMap.set(userId, []);
      }
      userRoleMap.get(userId)!.push(roleId);
    });

    return userRoleMap;
  }

  /**
   * 여러 역할의 사용자 ID 목록 조회 (배치 처리)
   */
  async findUserIdsByRoleIds(roleIds: string[]): Promise<Map<string, string[]>> {
    const result = await this.createQueryBuilder('ur')
      .select(['ur.role_id', 'ur.user_id'])
      .where('ur.role_id IN (:...roleIds)', { roleIds })
      .getRawMany();

    const roleUserMap = new Map<string, string[]>();

    result.forEach((row) => {
      const roleId = row.role_id;
      const userId = row.user_id;

      if (!roleUserMap.has(roleId)) {
        roleUserMap.set(roleId, []);
      }
      roleUserMap.get(roleId)!.push(userId);
    });

    return roleUserMap;
  }

  /**
   * 사용자-역할 관계 존재 확인 (최적화된 쿼리)
   */
  async existsUserRole(userId: string, roleId: string): Promise<boolean> {
    const result = await this.createQueryBuilder('ur')
      .select('1')
      .where('ur.user_id = :userId AND ur.role_id = :roleId', { userId, roleId })
      .limit(1)
      .getRawOne();

    return !!result;
  }
}
