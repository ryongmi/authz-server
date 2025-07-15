import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { TcpOperationResponse } from '@krgeobuk/core/interfaces';
import type { TcpUserId } from '@krgeobuk/user/tcp/interfaces';
import type { TcpRoleId } from '@krgeobuk/role/tcp/interfaces';
import {
  UserRoleTcpPatterns,
  type TcpUserRole,
  type TcpUserRoleBatch,
} from '@krgeobuk/user-role/tcp';

import { UserRoleService } from './user-role.service.js';

@Controller()
export class UserRoleTcpController {
  private readonly logger = new Logger(UserRoleTcpController.name);

  constructor(private readonly userRoleService: UserRoleService) {}

  @MessagePattern(UserRoleTcpPatterns.FIND_ROLES_BY_USER)
  async findRoleIdsByUserId(@Payload() data: TcpUserId): Promise<string[]> {
    try {
      this.logger.debug('TCP user-role find roles by user requested', {
        userId: data.userId,
      });
      return await this.userRoleService.getRoleIds(data.userId);
    } catch (error: unknown) {
      this.logger.error('TCP user-role find roles by user failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
      });
      throw error;
    }
  }

  @MessagePattern(UserRoleTcpPatterns.FIND_USERS_BY_ROLE)
  async findUserIdsByRoleId(@Payload() data: TcpRoleId): Promise<string[]> {
    try {
      this.logger.debug('TCP user-role find users by role requested', {
        roleId: data.roleId,
      });
      return await this.userRoleService.getUserIds(data.roleId);
    } catch (error: unknown) {
      this.logger.error('TCP user-role find users by role failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: data.roleId,
      });
      throw error;
    }
  }

  @MessagePattern(UserRoleTcpPatterns.EXISTS)
  async existsUserRole(@Payload() data: TcpUserRole): Promise<boolean> {
    try {
      this.logger.debug('TCP user-role exists check requested', {
        userId: data.userId,
        roleId: data.roleId,
      });
      return await this.userRoleService.exists(data.userId, data.roleId);
    } catch (error: unknown) {
      this.logger.error('TCP user-role exists check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        roleId: data.roleId,
      });
      throw error;
    }
  }

  @MessagePattern(UserRoleTcpPatterns.ASSIGN_MULTIPLE)
  async assignMultipleRoles(@Payload() data: TcpUserRoleBatch): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP user-role assign multiple requested', {
        userId: data.userId,
        roleCount: data.roleIds.length,
      });
      await this.userRoleService.assignMultipleRoles({
        userId: data.userId,
        roleIds: data.roleIds,
      });
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP user-role assign multiple failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        roleCount: data.roleIds.length,
      });
      throw error;
    }
  }

  @MessagePattern(UserRoleTcpPatterns.REVOKE_MULTIPLE)
  async revokeMultipleRoles(@Payload() data: TcpUserRoleBatch): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP user-role revoke multiple requested', {
        userId: data.userId,
        roleCount: data.roleIds.length,
      });
      await this.userRoleService.revokeMultipleRoles({
        userId: data.userId,
        roleIds: data.roleIds,
      });
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP user-role revoke multiple failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        roleCount: data.roleIds.length,
      });
      throw error;
    }
  }

  @MessagePattern(UserRoleTcpPatterns.REPLACE_ROLES)
  async replaceUserRoles(@Payload() data: TcpUserRoleBatch): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP user-role replace requested', {
        userId: data.userId,
        newRoleCount: data.roleIds.length,
      });
      await this.userRoleService.replaceUserRoles(data);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP user-role replace failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        newRoleCount: data.roleIds.length,
      });
      throw error;
    }
  }
}
