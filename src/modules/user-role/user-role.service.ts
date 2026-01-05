import { Injectable, Logger, HttpException } from '@nestjs/common';

import { In } from 'typeorm';

import { UserRoleException } from '@krgeobuk/user-role/exception';
import type { UserRoleBatchAssignmentResult } from '@krgeobuk/user-role/interfaces';
import type { TcpUserRoleBatch } from '@krgeobuk/user-role/tcp';
import type { UserRoleParams } from '@krgeobuk/shared/user-role';

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
  async exists(parmas: UserRoleParams): Promise<boolean> {
    const { userId, roleId } = parmas;

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
  async getRoleIdsBatch(userIds: string[]): Promise<Record<string, string[]>> {
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
  async getUserIdsBatch(roleIds: string[]): Promise<Record<string, string[]>> {
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
  async getRoleCountsBatch(roleIds: string[]): Promise<Record<string, number>> {
    try {
      const userIdsMap = await this.userRoleRepo.findUserIdsByRoleIds(roleIds);
      const userCounts: Record<string, number> = {};

      roleIds.forEach((roleId) => {
        const userIds = userIdsMap[roleId] || [];
        userCounts[roleId] = userIds.length;
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
  async assignUserRole(parmas: UserRoleParams): Promise<void> {
    const { userId, roleId } = parmas;

    try {
      // 중복 확인
      const exists = await this.exists({ userId, roleId });
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
  async revokeUserRole(parmas: UserRoleParams): Promise<void> {
    const { userId, roleId } = parmas;

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
  async assignMultipleRoles(dto: TcpUserRoleBatch): Promise<UserRoleBatchAssignmentResult> {
    const { userId, roleIds } = dto;

    try {
      // 1. 기존 할당 역할 조회
      const existingRoles = await this.getRoleIds(userId);
      const newRoles = roleIds.filter((id) => !existingRoles.includes(id));
      const duplicates = roleIds.filter((id) => existingRoles.includes(id));

      if (newRoles.length === 0) {
        this.logger.warn('No new roles to assign - all already exist', {
          userId,
          requestedCount: roleIds.length,
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
            userId,
            assignedRoles: [],
          },
        };
      }

      // 2. 새로운 역할만 할당
      const entities = newRoles.map((roleId) => {
        const entity = new UserRoleEntity();
        entity.userId = userId;
        entity.roleId = roleId;
        return entity;
      });

      await this.userRoleRepo.save(entities);

      this.logger.log('Multiple user roles assigned successfully', {
        userId,
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
          userId,
          assignedRoles: newRoles,
        },
      };
    } catch (error: unknown) {
      this.logger.error('Multiple user roles assignment failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        roleCount: roleIds.length,
      });

      throw UserRoleException.assignMultipleError();
    }
  }

  /**
   * 여러 역할 해제 (배치)
   */
  async revokeMultipleRoles(dto: TcpUserRoleBatch): Promise<void> {
    const { userId, roleIds } = dto;

    try {
      await this.userRoleRepo.delete({
        userId,
        roleId: In(roleIds),
      });

      this.logger.log('Multiple user roles revoked successfully', {
        userId,
        roleCount: roleIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('Multiple user roles revocation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        roleCount: roleIds.length,
      });

      throw UserRoleException.revokeMultipleError();
    }
  }

  /**
   * 사용자 역할 완전 교체 (배치)
   */
  async replaceUserRoles(dto: TcpUserRoleBatch): Promise<void> {
    const { userId, roleIds } = dto;

    try {
      await this.userRoleRepo.manager.transaction(async (manager) => {
        // 1. 기존 역할 모두 삭제
        await manager.delete(UserRoleEntity, { userId });

        // 2. 새로운 역할 배치 삽입
        if (roleIds.length > 0) {
          const entities = roleIds.map((roleId) => {
            const entity = new UserRoleEntity();
            entity.userId = userId;
            entity.roleId = roleId;
            return entity;
          });

          await manager.save(UserRoleEntity, entities);
        }
      });

      this.logger.log('User roles replaced successfully', {
        userId,
        newRoleCount: roleIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('User roles replacement failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        newRoleCount: roleIds.length,
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

  // ==================== 계정 병합 메서드 ====================

  /**
   * 사용자 역할 병합 (계정 병합용)
   * sourceUserId의 모든 역할을 targetUserId로 이전 (UPDATE 방식)
   */
  async mergeUserRoles(sourceUserId: string, targetUserId: string): Promise<void> {
    try {
      this.logger.log('Starting user role merge', {
        sourceUserId,
        targetUserId,
      });

      // 1. source 사용자의 역할 조회
      const sourceRoleIds = await this.getRoleIds(sourceUserId);

      if (sourceRoleIds.length === 0) {
        this.logger.warn('Source user has no roles to merge', {
          sourceUserId,
          targetUserId,
        });
        return;
      }

      // 2. target 사용자의 기존 역할 조회
      const targetRoleIds = await this.getRoleIds(targetUserId);

      // 3. 중복되지 않은 역할 (target으로 이전할 것)
      const uniqueRoleIds = sourceRoleIds.filter((roleId) => !targetRoleIds.includes(roleId));

      // 4. 중복되는 역할 (source에서 삭제할 것)
      const duplicateRoleIds = sourceRoleIds.filter((roleId) => targetRoleIds.includes(roleId));

      await this.userRoleRepo.manager.transaction(async (manager) => {
        // 5. 중복되지 않은 역할을 target 사용자로 UPDATE (소유권 이전)
        if (uniqueRoleIds.length > 0) {
          await manager
            .createQueryBuilder()
            .update(UserRoleEntity)
            .set({ userId: targetUserId })
            .where('userId = :sourceUserId', { sourceUserId })
            .andWhere('roleId IN (:...uniqueRoleIds)', { uniqueRoleIds })
            .execute();
        }

        // 6. 중복되는 역할은 source에서 삭제
        if (duplicateRoleIds.length > 0) {
          await manager.delete(UserRoleEntity, {
            userId: sourceUserId,
            roleId: In(duplicateRoleIds),
          });
        }
      });

      this.logger.log('User roles merged successfully', {
        sourceUserId,
        targetUserId,
        sourceRoleCount: sourceRoleIds.length,
        targetRoleCount: targetRoleIds.length,
        transferred: uniqueRoleIds.length,
        duplicatesRemoved: duplicateRoleIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('User role merge failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sourceUserId,
        targetUserId,
      });

      throw UserRoleException.assignMultipleError();
    }
  }

  /**
   * 사용자 역할 병합 롤백 (보상 트랜잭션)
   * 병합된 역할을 원래 사용자로 되돌림
   *
   * @param sourceUserId User B (원래 소유자)
   * @param targetUserId User A (병합 대상)
   * @param sourceRoleIds User B가 원래 가지고 있던 역할 목록
   */
  async rollbackMerge(
    sourceUserId: string,
    targetUserId: string,
    sourceRoleIds: string[]
  ): Promise<void> {
    try {
      this.logger.log('Starting user role merge rollback', {
        sourceUserId,
        targetUserId,
        originalRoleCount: sourceRoleIds.length,
      });

      if (sourceRoleIds.length === 0) {
        this.logger.warn('No roles to rollback', {
          sourceUserId,
          targetUserId,
        });
        return;
      }

      // 현재 target 사용자의 역할 조회
      const currentTargetRoleIds = await this.getRoleIds(targetUserId);

      await this.userRoleRepo.manager.transaction(async (manager) => {
        // 1. target에 추가된 역할을 source로 되돌림
        // sourceRoleIds 중 현재 target에 있는 역할만 되돌림
        const rolesToRestore = sourceRoleIds.filter((roleId) =>
          currentTargetRoleIds.includes(roleId)
        );

        if (rolesToRestore.length > 0) {
          // target에서 해당 역할 제거
          await manager.delete(UserRoleEntity, {
            userId: targetUserId,
            roleId: In(rolesToRestore),
          });

          // source에 역할 재할당
          const entities = rolesToRestore.map((roleId) => {
            const entity = new UserRoleEntity();
            entity.userId = sourceUserId;
            entity.roleId = roleId;
            return entity;
          });

          await manager.save(UserRoleEntity, entities);
        }
      });

      this.logger.log('User roles rollback completed successfully', {
        sourceUserId,
        targetUserId,
        restoredCount: sourceRoleIds.filter((roleId) =>
          currentTargetRoleIds.includes(roleId)
        ).length,
      });
    } catch (error: unknown) {
      this.logger.error('User role rollback failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sourceUserId,
        targetUserId,
      });

      throw UserRoleException.assignMultipleError();
    }
  }
}
