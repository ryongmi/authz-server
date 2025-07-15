import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { AuthorizationTcpPatterns } from '@krgeobuk/authorization/tcp/patterns';
import {
  TcpCheckPermissionRequest,
  TcpCheckRoleRequest,
  TcpGetUserRolesRequest,
  TcpGetUserPermissionsRequest,
} from '@krgeobuk/authorization/tcp/interfaces';
import { PermissionCheckResponse, RoleCheckResponse } from '@krgeobuk/shared/authorization';

import { AuthorizationService } from './authorization.service.js';

@Controller()
export class AuthorizationTcpController {
  private readonly logger = new Logger(AuthorizationTcpController.name);

  constructor(private readonly authorizationService: AuthorizationService) {}

  // ==================== 권한 체크 패턴 ====================

  @MessagePattern(AuthorizationTcpPatterns.CHECK_PERMISSION)
  async checkPermission(
    @Payload() data: TcpCheckPermissionRequest
  ): Promise<PermissionCheckResponse> {
    try {
      this.logger.debug('TCP permission check requested', {
        userId: data.userId,
        action: data.action,
        serviceId: data.serviceId,
      });

      const hasPermission = await this.authorizationService.checkUserPermission(data);

      this.logger.debug('TCP permission check completed', {
        userId: data.userId,
        action: data.action,
        serviceId: data.serviceId,
        hasPermission,
      });

      return { hasPermission };
    } catch (error: unknown) {
      this.logger.error('TCP permission check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        action: data.action,
        serviceId: data.serviceId,
      });
      throw error;
    }
  }

  @MessagePattern(AuthorizationTcpPatterns.CHECK_ROLE)
  async checkRole(@Payload() data: TcpCheckRoleRequest): Promise<RoleCheckResponse> {
    try {
      this.logger.debug('TCP role check requested', {
        userId: data.userId,
        roleName: data.roleName,
        serviceId: data.serviceId,
      });

      const hasRole = await this.authorizationService.checkUserRole(data);

      this.logger.debug('TCP role check completed', {
        userId: data.userId,
        roleName: data.roleName,
        serviceId: data.serviceId,
        hasRole,
      });

      return { hasRole };
    } catch (error: unknown) {
      this.logger.error('TCP role check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        roleName: data.roleName,
        serviceId: data.serviceId,
      });
      throw error;
    }
  }

  // ==================== 사용자 권한/역할 조회 패턴 ====================

  @MessagePattern(AuthorizationTcpPatterns.GET_USER_PERMISSIONS)
  async getUserPermissions(@Payload() data: TcpGetUserPermissionsRequest): Promise<string[]> {
    try {
      this.logger.debug('TCP user permissions requested', {
        userId: data.userId,
        serviceId: data.serviceId,
      });

      const permissions = await this.authorizationService.getUserPermissions(
        data.userId,
        data.serviceId
      );

      this.logger.debug('TCP user permissions retrieved', {
        userId: data.userId,
        serviceId: data.serviceId,
        permissionCount: permissions.length,
      });

      return permissions;
    } catch (error: unknown) {
      this.logger.error('TCP user permissions retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        serviceId: data.serviceId,
      });
      throw error;
    }
  }

  @MessagePattern(AuthorizationTcpPatterns.GET_USER_ROLES)
  async getUserRoles(@Payload() data: TcpGetUserRolesRequest): Promise<string[]> {
    try {
      this.logger.debug('TCP user roles requested', {
        userId: data.userId,
        serviceId: data.serviceId,
      });

      const roles = await this.authorizationService.getUserRoles(data.userId, data.serviceId);

      this.logger.debug('TCP user roles retrieved', {
        userId: data.userId,
        serviceId: data.serviceId,
        roleCount: roles.length,
      });

      return roles;
    } catch (error: unknown) {
      this.logger.error('TCP user roles retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        serviceId: data.serviceId,
      });
      throw error;
    }
  }
}

