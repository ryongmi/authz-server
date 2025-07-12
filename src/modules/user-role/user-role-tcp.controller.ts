import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { TcpOperationResponse } from '@krgeobuk/core/interfaces';
import type { TcpUserParams } from '@krgeobuk/user/tcp/interfaces';
import type { TcpRoleParams } from '@krgeobuk/role/tcp/interfaces';
import type {
  TcpUserRoleParams,
  TcpUserRoleBatch,
} from '@krgeobuk/authz-relations/user-role/tcp/interfaces';
import { UserRoleTcpPatterns } from '@krgeobuk/authz-relations/user-role/tcp/patterns';

import { UserRoleService } from './user-role.service.js';

@Controller()
export class UserRoleTcpController {
  private readonly logger = new Logger(UserRoleTcpController.name);

  constructor(private readonly userRoleService: UserRoleService) {}

  @MessagePattern(UserRoleTcpPatterns.FIND_ROLES_BY_USER)
  async findRoleIdsByUserId(@Payload() data: TcpUserParams): Promise<string[]> {
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
  async findUserIdsByRoleId(@Payload() data: TcpRoleParams): Promise<string[]> {
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
  async existsUserRole(@Payload() data: TcpUserRoleParams): Promise<boolean> {
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

  @MessagePattern(UserRoleTcpPatterns.ASSIGN_ROLE)
  async assignRole(@Payload() data: TcpUserRoleParams): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP user-role assign requested', {
        userId: data.userId,
        roleId: data.roleId,
      });
      await this.userRoleService.assignRole(data.userId, data.roleId);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP user-role assign failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        roleId: data.roleId,
      });
      throw error;
    }
  }

  @MessagePattern(UserRoleTcpPatterns.ASSIGN_MULTIPLE_ROLES)
  async assignMultipleRoles(@Payload() data: TcpUserRoleBatch): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP user-role assign multiple requested', {
        userId: data.userId,
        roleCount: data.roleIds.length,
      });
      await this.userRoleService.assignMultipleRoles(data.userId, data.roleIds);
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

  @MessagePattern(UserRoleTcpPatterns.REVOKE_ROLE)
  async revokeRole(@Payload() data: TcpUserRoleParams): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP user-role revoke requested', {
        userId: data.userId,
        roleId: data.roleId,
      });
      await this.userRoleService.revokeRole(data.userId, data.roleId);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP user-role revoke failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        roleId: data.roleId,
      });
      throw error;
    }
  }

  @MessagePattern(UserRoleTcpPatterns.REVOKE_MULTIPLE_ROLES)
  async revokeMultipleRoles(@Payload() data: TcpUserRoleBatch): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP user-role revoke multiple requested', {
        userId: data.userId,
        roleCount: data.roleIds.length,
      });
      await this.userRoleService.revokeMultipleRoles(data.userId, data.roleIds);
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

  @MessagePattern(UserRoleTcpPatterns.REVOKE_ALL_ROLES_FROM_USER)
  async revokeAllRolesFromUser(@Payload() data: TcpUserParams): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP user-role revoke all roles from user requested', {
        userId: data.userId,
      });
      await this.userRoleService.revokeAllRolesFromUser(data.userId);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP user-role revoke all roles from user failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
      });
      throw error;
    }
  }

  @MessagePattern(UserRoleTcpPatterns.REVOKE_ALL_USERS_FROM_ROLE)
  async revokeAllUsersFromRole(@Payload() data: TcpRoleParams): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP user-role revoke all users from role requested', {
        roleId: data.roleId,
      });
      await this.userRoleService.revokeAllUsersFromRole(data.roleId);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP user-role revoke all users from role failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: data.roleId,
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