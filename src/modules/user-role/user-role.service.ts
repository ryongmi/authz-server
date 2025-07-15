import { Injectable, Logger, HttpException } from '@nestjs/common';

import { In } from 'typeorm';

import { UserRoleException } from '@krgeobuk/user-role/exception';
import type { UserRoleBatchAssignmentResult } from '@krgeobuk/user-role/interfaces';

import { UserRoleEntity } from './entities/user-role.entity.js';
import { UserRoleRepository } from './user-role.repository.js';

@Injectable()
export class UserRoleService {
  private readonly logger = new Logger(UserRoleService.name);

  constructor(private readonly userRoleRepo: UserRoleRepository) {}

  // ==================== 조회 메서드 (ID 목록 반환) ====================

  /**
   * 사용자의 역할 ID 목록 조회
   */
  async getRoleIds(userId: string): Promise<string[]> {
    try {
      return await this.userRoleRepo.findRoleIdsByUserId(userId);
    } catch (error: unknown) {
      this.logger.error('Role IDs fetch by user failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw UserRoleException.fetchError();
    }
  }

  /**
   * 역할의 사용자 ID 목록 조회
   */
  async getUserIds(roleId: string): Promise<string[]> {
    try {
      return await this.userRoleRepo.findUserIdsByRoleId(roleId);
    } catch (error: unknown) {
      this.logger.error('User IDs fetch by role failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
      });
      throw UserRoleException.fetchError();
    }
  }

  /**
   * 사용자-역할 관계 존재 확인
   */
  async exists(userId: string, roleId: string): Promise<boolean> {
    try {
      return await this.userRoleRepo.existsUserRole(userId, roleId);
    } catch (error: unknown) {
      this.logger.error('User role existence check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        roleId,
      });
      throw UserRoleException.fetchError();
    }
  }

  /**
   * 여러 사용자의 역할 ID 목록 조회 (배치)
   */
  async getRoleIdsBatch(userIds: string[]): Promise<Map<string, string[]>> {
    try {
      return await this.userRoleRepo.findRoleIdsByUserIds(userIds);
    } catch (error: unknown) {
      this.logger.error('Role IDs fetch by users failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userCount: userIds.length,
      });
      throw UserRoleException.fetchError();
    }
  }

  /**
   * 여러 역할의 사용자 ID 목록 조회 (배치)
   */
  async getUserIdsBatch(roleIds: string[]): Promise<Map<string, string[]>> {
    try {
      return await this.userRoleRepo.findUserIdsByRoleIds(roleIds);
    } catch (error: unknown) {
      this.logger.error('User IDs fetch by roles failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleCount: roleIds.length,
      });
      throw UserRoleException.fetchError();
    }
  }

  /**
   * 여러 권한의 사용자 수 조회 (배치) - 성능 최적화
   */
  async getRoleCountsBatch(roleIds: string[]): Promise<Map<string, number>> {
    try {
      const userIdsMap = await this.userRoleRepo.findUserIdsByRoleIds(roleIds);
      const userCounts = new Map<string, number>();

      roleIds.forEach((roleId) => {
        const roleIds = userIdsMap.get(roleId) || [];
        userCounts.set(roleId, roleIds.length);
      });

      return userCounts;
    } catch (error: unknown) {
      this.logger.error('역할별 사용자 수 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleCount: roleIds.length,
      });
      throw UserRoleException.fetchError();
    }
  }

  // ==================== 변경 메서드 ====================

  /**
   * 단일 사용자-역할 할당
   */
  async assignUserRole(dto: { userId: string; roleId: string }): Promise<void> {
    const { userId, roleId } = dto;
    try {
      // 중복 확인
      const exists = await this.exists(userId, roleId);
      if (exists) {
        this.logger.warn('User role already assigned', {
          userId,
          roleId,
        });
        throw UserRoleException.userRoleAlreadyExists();
      }

      const entity = new UserRoleEntity();
      Object.assign(entity, { userId, roleId });

      await this.userRoleRepo.save(entity);

      this.logger.log('User role assigned successfully', {
        userId,
        roleId,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('User role assignment failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        roleId,
      });

      throw UserRoleException.assignError();
    }
  }

  /**
   * 단일 사용자-역할 해제
   */
  async revokeUserRole(userId: string, roleId: string): Promise<void> {
    try {
      const result = await this.userRoleRepo.delete({ userId, roleId });

      if (result.affected === 0) {
        this.logger.warn('User role not found for revocation', {
          userId,
          roleId,
        });
        throw UserRoleException.userRoleNotFound();
      }

      this.logger.log('User role revoked successfully', {
        userId,
        roleId,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('User role revocation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        roleId,
      });

      throw UserRoleException.revokeError();
    }
  }

  /**
   * 여러 역할 할당 (배치) - 개선된 로직
   */
  async assignMultipleRoles(dto: {
    userId: string;
    roleIds: string[];
  }): Promise<UserRoleBatchAssignmentResult> {
    try {
      // 1. 기존 할당 역할 조회
      const existingRoles = await this.getRoleIds(dto.userId);
      const newRoles = dto.roleIds.filter((id) => !existingRoles.includes(id));
      const duplicates = dto.roleIds.filter((id) => existingRoles.includes(id));

      if (newRoles.length === 0) {
        this.logger.warn('No new roles to assign - all already exist', {
          userId: dto.userId,
          requestedCount: dto.roleIds.length,
          duplicateCount: duplicates.length,
        });

        return {
          success: true,
          affected: 0,
          details: {
            assigned: 0,
            skipped: duplicates.length,
            duplicates,
            newAssignments: [],
            userId: dto.userId,
            assignedRoles: [],
          },
        };
      }

      // 2. 새로운 역할만 할당
      const entities = newRoles.map((roleId) => {
        const entity = new UserRoleEntity();
        entity.userId = dto.userId;
        entity.roleId = roleId;
        return entity;
      });

      await this.userRoleRepo.save(entities);

      this.logger.log('Multiple user roles assigned successfully', {
        userId: dto.userId,
        assignedCount: newRoles.length,
        skippedCount: duplicates.length,
        totalRequested: dto.roleIds.length,
      });

      return {
        success: true,
        affected: newRoles.length,
        details: {
          assigned: newRoles.length,
          skipped: duplicates.length,
          duplicates,
          newAssignments: newRoles,
          userId: dto.userId,
          assignedRoles: newRoles,
        },
      };
    } catch (error: unknown) {
      this.logger.error('Multiple user roles assignment failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: dto.userId,
        roleCount: dto.roleIds.length,
      });

      throw UserRoleException.assignMultipleError();
    }
  }

  /**
   * 여러 역할 해제 (배치)
   */
  async revokeMultipleRoles(dto: { userId: string; roleIds: string[] }): Promise<void> {
    try {
      await this.userRoleRepo.delete({
        userId: dto.userId,
        roleId: In(dto.roleIds),
      });

      this.logger.log('Multiple user roles revoked successfully', {
        userId: dto.userId,
        roleCount: dto.roleIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('Multiple user roles revocation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: dto.userId,
        roleCount: dto.roleIds.length,
      });

      throw UserRoleException.revokeMultipleError();
    }
  }

  /**
   * 사용자 역할 완전 교체 (배치)
   */
  async replaceUserRoles(dto: { userId: string; roleIds: string[] }): Promise<void> {
    try {
      await this.userRoleRepo.manager.transaction(async (manager) => {
        // 1. 기존 역할 모두 삭제
        await manager.delete(UserRoleEntity, { userId: dto.userId });

        // 2. 새로운 역할 배치 삽입
        if (dto.roleIds.length > 0) {
          const entities = dto.roleIds.map((roleId) => {
            const entity = new UserRoleEntity();
            entity.userId = dto.userId;
            entity.roleId = roleId;
            return entity;
          });

          await manager.save(UserRoleEntity, entities);
        }
      });

      this.logger.log('User roles replaced successfully', {
        userId: dto.userId,
        newRoleCount: dto.roleIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('User roles replacement failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: dto.userId,
        newRoleCount: dto.roleIds.length,
      });

      throw UserRoleException.replaceError();
    }
  }

  /**
   * 역할에 할당된 사용자 존재 확인 (성능 최적화)
   */
  async hasUsersForRole(roleId: string): Promise<boolean> {
    try {
      const userIds = await this.userRoleRepo.findUserIdsByRoleId(roleId);
      return userIds.length > 0;
    } catch (error: unknown) {
      this.logger.error('Users existence check for role failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
      });
      throw UserRoleException.fetchError();
    }
  }
}

