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
      .select('ur.roleId')
      .where('ur.userId = :userId', { userId })
      .getRawMany();

    return result.map((row) => row.ur_roleId);
  }

  /**
   * 역할별 사용자 ID 목록 조회 (최적화된 쿼리)
   */
  async findUserIdsByRoleId(roleId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('ur')
      .select('ur.userId')
      .where('ur.roleId = :roleId', { roleId })
      .getRawMany();

    return result.map((row) => row.ur_userId);
  }

  /**
   * 여러 사용자의 역할 ID 목록 조회 (배치 처리)
   */
  async findRoleIdsByUserIds(userIds: string[]): Promise<Map<string, string[]>> {
    const result = await this.createQueryBuilder('ur')
      .select(['ur.userId', 'ur.roleId'])
      .where('ur.userId IN (:...userIds)', { userIds })
      .getRawMany();

    const userRoleMap = new Map<string, string[]>();

    result.forEach((row) => {
      const userId = row.ur_userId;
      const roleId = row.ur_roleId;

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
      .select(['ur.roleId', 'ur.userId'])
      .where('ur.roleId IN (:...roleIds)', { roleIds })
      .getRawMany();

    const roleUserMap = new Map<string, string[]>();

    result.forEach((row) => {
      const roleId = row.ur_roleId;
      const userId = row.ur_userId;

      if (!roleUserMap.has(roleId)) {
        roleUserMap.set(roleId, []);
      }
      roleUserMap.get(roleId)!.push(userId);
    });

    return roleUserMap;
  }

  /**
   * 사용자-역할 관계 존재 확인
   */
  async existsUserRole(userId: string, roleId: string): Promise<boolean> {
    const count = await this.createQueryBuilder('ur')
      .where('ur.userId = :userId AND ur.roleId = :roleId', { userId, roleId })
      .getCount();

    return count > 0;
  }
}
