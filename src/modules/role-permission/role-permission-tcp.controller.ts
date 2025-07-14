import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { TcpOperationResponse } from '@krgeobuk/core/interfaces';
import type { TcpRoleParams } from '@krgeobuk/role/tcp/interfaces';
import type { TcpPermissionParams } from '@krgeobuk/permission/tcp/interfaces';
import {
  RolePermissionTcpPatterns,
  type TcpRolePermissionParams,
  type TcpRolePermissionBatch,
} from '@krgeobuk/role-permission/tcp';

import { RolePermissionService } from './role-permission.service.js';

@Controller()
export class RolePermissionTcpController {
  private readonly logger = new Logger(RolePermissionTcpController.name);

  constructor(private readonly rolePermissionService: RolePermissionService) {}

  @MessagePattern(RolePermissionTcpPatterns.ASSIGN_MULTIPLE)
  async assignMultiplePermissions(
    @Payload() data: TcpRolePermissionBatch
  ): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP role-permission assign multiple requested', {
        roleId: data.roleId,
        permissionCount: data.permissionIds.length,
      });
      await this.rolePermissionService.assignMultiplePermissions(data);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP role-permission assign multiple failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: data.roleId,
        permissionCount: data.permissionIds.length,
      });
      throw error;
    }
  }

  @MessagePattern(RolePermissionTcpPatterns.REVOKE_MULTIPLE)
  async revokeMultiplePermissions(
    @Payload() data: TcpRolePermissionBatch
  ): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP role-permission revoke multiple requested', {
        roleId: data.roleId,
        permissionCount: data.permissionIds.length,
      });
      await this.rolePermissionService.revokeMultiplePermissions(data);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP role-permission revoke multiple failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: data.roleId,
        permissionCount: data.permissionIds.length,
      });
      throw error;
    }
  }

  @MessagePattern(RolePermissionTcpPatterns.REPLACE_PERMISSIONS)
  async replaceRolePermissions(
    @Payload() data: TcpRolePermissionBatch
  ): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP role-permission replace requested', {
        roleId: data.roleId,
        newPermissionCount: data.permissionIds.length,
      });
      await this.rolePermissionService.replaceRolePermissions(data);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP role-permission replace failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: data.roleId,
        newPermissionCount: data.permissionIds.length,
      });
      throw error;
    }
  }

  @MessagePattern(RolePermissionTcpPatterns.FIND_PERMISSIONS_BY_ROLE)
  async findPermissionIdsByRoleId(@Payload() data: TcpRoleParams): Promise<string[]> {
    try {
      this.logger.debug('TCP role-permission find permissions by role requested', {
        roleId: data.roleId,
      });
      return await this.rolePermissionService.getPermissionIds(data.roleId);
    } catch (error: unknown) {
      this.logger.error('TCP role-permission find permissions by role failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: data.roleId,
      });
      throw error;
    }
  }

  @MessagePattern(RolePermissionTcpPatterns.FIND_ROLES_BY_PERMISSION)
  async findRoleIdsByPermissionId(@Payload() data: TcpPermissionParams): Promise<string[]> {
    try {
      this.logger.debug('TCP role-permission find roles by permission requested', {
        permissionId: data.permissionId,
      });
      return await this.rolePermissionService.getRoleIds(data.permissionId);
    } catch (error: unknown) {
      this.logger.error('TCP role-permission find roles by permission failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionId: data.permissionId,
      });
      throw error;
    }
  }

  @MessagePattern(RolePermissionTcpPatterns.EXISTS)
  async checkRolePermissionExists(@Payload() data: TcpRolePermissionParams): Promise<boolean> {
    try {
      this.logger.debug('TCP role-permission exists check requested', {
        roleId: data.roleId,
        permissionId: data.permissionId,
      });
      return await this.rolePermissionService.exists(data.roleId, data.permissionId);
    } catch (error: unknown) {
      this.logger.error('TCP role-permission exists check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: data.roleId,
        permissionId: data.permissionId,
      });
      throw error;
    }
  }
}
