import { Injectable, Logger, HttpException } from '@nestjs/common';

import { In } from 'typeorm';

import { UserRoleException } from '@krgeobuk/user-role/exception';
import type { JunctionTableOperationResult } from '@krgeobuk/core/interfaces';

export type UserRoleBatchAssignmentResult = JunctionTableOperationResult;

import { UserRoleEntity } from './entities/user-role.entity.js';
import { UserRoleRepository } from './user-role.repository.js';

@Injectable()
export class UserRoleService {
  private readonly logger = new Logger(UserRoleService.name);

  constructor(
    private readonly userRoleRepo: UserRoleRepository
  ) {}

  // ==================== 조회 메서드 (ID 목록 반환) ====================

  async findByUserId(userId: string): Promise<UserRoleEntity[]> {
    return this.userRoleRepo.find({ where: { userId } });
  }

  async findByRoleId(roleId: string): Promise<UserRoleEntity[]> {
    return this.userRoleRepo.find({ where: { roleId } });
  }

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

  // ==================== 변경 메서드 ====================

  /**
   * 단일 사용자-역할 할당
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
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
      entity.userId = userId;
      entity.roleId = roleId;

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
  async revokeRole(userId: string, roleId: string): Promise<void> {
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
   * 여러 역할 할당 (배치)
   */
  async assignMultipleRoles(userId: string, roleIds: string[]): Promise<UserRoleBatchAssignmentResult> {
    try {
      // 1. 기존 관계 확인
      const existingRoles = await this.getRoleIds(userId);
      const duplicates = roleIds.filter(roleId => existingRoles.includes(roleId));
      const newRoleIds = roleIds.filter(roleId => !existingRoles.includes(roleId));

      if (newRoleIds.length === 0) {
        this.logger.warn('All roles already assigned', {
          userId,
          duplicates: duplicates.length,
        });
        
        return {
          success: false,
          affected: 0,
          details: {
            assigned: 0,
            skipped: duplicates.length,
            duplicates,
          },
        };
      }

      // 2. 새로운 관계 생성
      const entities = newRoleIds.map((roleId) => {
        const entity = new UserRoleEntity();
        entity.userId = userId;
        entity.roleId = roleId;
        return entity;
      });

      // 3. 배치 삽입
      const result = await this.userRoleRepo
        .createQueryBuilder()
        .insert()
        .into(UserRoleEntity)
        .values(entities)
        .orIgnore() // MySQL: ON DUPLICATE KEY UPDATE (무시)
        .execute();

      const assigned = result.raw.affectedRows || newRoleIds.length;

      this.logger.log('Multiple user roles assigned successfully', {
        userId,
        assigned,
        skipped: duplicates.length,
      });

      return {
        success: true,
        affected: assigned,
        details: {
          assigned,
          skipped: duplicates.length,
          duplicates: duplicates.length > 0 ? duplicates : undefined,
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
  async revokeMultipleRoles(userId: string, roleIds: string[]): Promise<void> {
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
   * 사용자의 모든 역할 해제
   */
  async revokeAllRolesFromUser(userId: string): Promise<void> {
    try {
      const result = await this.userRoleRepo.delete({ userId });
      
      this.logger.log('All roles revoked from user successfully', {
        userId,
        revokedCount: result.affected || 0,
      });
    } catch (error: unknown) {
      this.logger.error('Revoke all roles from user failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });

      throw UserRoleException.revokeAllFromUserError();
    }
  }

  /**
   * 역할의 모든 사용자 해제
   */
  async revokeAllUsersFromRole(roleId: string): Promise<void> {
    try {
      const result = await this.userRoleRepo.delete({ roleId });
      
      this.logger.log('All users revoked from role successfully', {
        roleId,
        revokedCount: result.affected || 0,
      });
    } catch (error: unknown) {
      this.logger.error('Revoke all users from role failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
      });

      throw UserRoleException.revokeAllFromRoleError();
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

}
