import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import type {
  TcpUserRole,
  TcpUserRoleBatch,
  TcpMergeUserRoles,
} from '@krgeobuk/user-role/tcp/interfaces';
import type { UserRoleBatchAssignmentResult } from '@krgeobuk/user-role/interfaces';
import { UserRoleTcpPatterns } from '@krgeobuk/user-role/tcp/patterns';

import { UserRoleService } from './user-role.service.js';

@Controller()
export class UserRoleTcpController {
  private readonly logger = new Logger(UserRoleTcpController.name);

  constructor(private readonly userRoleService: UserRoleService) {}

  /**
   * 사용자 역할 ID 목록 조회 (TCP)
   */
  @MessagePattern(UserRoleTcpPatterns.FIND_ROLES_BY_USER)
  async findRolesByUser(@Payload() data: { userId: string }): Promise<string[]> {
    try {
      this.logger.debug('TCP: Finding roles by user', {
        userId: data.userId,
      });

      return await this.userRoleService.getRoleIds(data.userId);
    } catch (error: unknown) {
      this.logger.error('TCP: Failed to find roles by user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
      });

      return [];
    }
  }

  /**
   * 역할 사용자 ID 목록 조회 (TCP)
   */
  @MessagePattern(UserRoleTcpPatterns.FIND_USERS_BY_ROLE)
  async findUsersByRole(@Payload() data: { roleId: string }): Promise<string[]> {
    try {
      this.logger.debug('TCP: Finding users by role', {
        roleId: data.roleId,
      });

      return await this.userRoleService.getUserIds(data.roleId);
    } catch (error: unknown) {
      this.logger.error('TCP: Failed to find users by role', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: data.roleId,
      });

      return [];
    }
  }

  /**
   * 사용자-역할 관계 존재 확인 (TCP)
   */
  @MessagePattern(UserRoleTcpPatterns.EXISTS)
  async exists(@Payload() data: TcpUserRole): Promise<boolean> {
    try {
      this.logger.debug('TCP: Checking user-role existence', {
        userId: data.userId,
        roleId: data.roleId,
      });

      return await this.userRoleService.exists(data);
    } catch (error: unknown) {
      this.logger.error('TCP: Failed to check user-role existence', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        roleId: data.roleId,
      });

      return false;
    }
  }

  /**
   * 여러 역할 할당 (TCP 배치 처리)
   */
  @MessagePattern(UserRoleTcpPatterns.ASSIGN_MULTIPLE)
  async assignMultiple(@Payload() data: TcpUserRoleBatch): Promise<UserRoleBatchAssignmentResult> {
    try {
      this.logger.debug('TCP: Assigning multiple roles', {
        userId: data.userId,
        roleCount: data.roleIds.length,
      });

      return await this.userRoleService.assignMultipleRoles(data);
    } catch (error: unknown) {
      this.logger.error('TCP: Failed to assign multiple roles', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        roleCount: data.roleIds.length,
      });

      return {
        success: false,
        affected: 0,
        details: {
          assigned: 0,
          skipped: 0,
          duplicates: [],
          newAssignments: [],
          userId: data.userId,
          assignedRoles: [],
        },
      };
    }
  }

  /**
   * 여러 역할 해제 (TCP 배치 처리)
   */
  @MessagePattern(UserRoleTcpPatterns.REVOKE_MULTIPLE)
  async revokeMultiple(@Payload() data: TcpUserRoleBatch): Promise<void> {
    try {
      this.logger.debug('TCP: Revoking multiple roles', {
        userId: data.userId,
        roleCount: data.roleIds.length,
      });

      await this.userRoleService.revokeMultipleRoles(data);
    } catch (error: unknown) {
      this.logger.error('TCP: Failed to revoke multiple roles', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        roleCount: data.roleIds.length,
      });

      throw error;
    }
  }

  /**
   * 사용자 역할 완전 교체 (TCP)
   */
  @MessagePattern(UserRoleTcpPatterns.REPLACE_ROLES)
  async replaceRoles(@Payload() data: TcpUserRoleBatch): Promise<void> {
    try {
      this.logger.debug('TCP: Replacing user roles', {
        userId: data.userId,
        newRoleCount: data.roleIds.length,
      });

      await this.userRoleService.replaceUserRoles(data);
    } catch (error: unknown) {
      this.logger.error('TCP: Failed to replace user roles', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        newRoleCount: data.roleIds.length,
      });

      throw error;
    }
  }

  /**
   * 사용자 역할 병합 (계정 병합용 TCP)
   */
  @MessagePattern(UserRoleTcpPatterns.MERGE_USER_ROLES)
  async mergeUserRoles(@Payload() data: TcpMergeUserRoles): Promise<void> {
    try {
      this.logger.log('TCP: Merging user roles', {
        sourceUserId: data.sourceUserId,
        targetUserId: data.targetUserId,
      });

      await this.userRoleService.mergeUserRoles(data.sourceUserId, data.targetUserId);

      this.logger.log('TCP: User roles merged successfully', {
        sourceUserId: data.sourceUserId,
        targetUserId: data.targetUserId,
      });
    } catch (error: unknown) {
      this.logger.error('TCP: Failed to merge user roles', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sourceUserId: data.sourceUserId,
        targetUserId: data.targetUserId,
      });

      throw error;
    }
  }

  /**
   * 사용자 역할 병합 롤백 (보상 트랜잭션 TCP)
   */
  @MessagePattern(UserRoleTcpPatterns.ROLLBACK_MERGE)
  async rollbackMerge(
    @Payload()
    data: {
      sourceUserId: string;
      targetUserId: string;
      sourceRoleIds: string[];
    }
  ): Promise<void> {
    try {
      this.logger.log('TCP: Rolling back user roles merge', {
        sourceUserId: data.sourceUserId,
        targetUserId: data.targetUserId,
        roleCount: data.sourceRoleIds.length,
      });

      await this.userRoleService.rollbackMerge(
        data.sourceUserId,
        data.targetUserId,
        data.sourceRoleIds
      );

      this.logger.log('TCP: User roles rollback successful', {
        sourceUserId: data.sourceUserId,
        targetUserId: data.targetUserId,
      });
    } catch (error: unknown) {
      this.logger.error('TCP: Failed to rollback user roles merge', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sourceUserId: data.sourceUserId,
        targetUserId: data.targetUserId,
      });

      throw error;
    }
  }
}
