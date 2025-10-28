import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { AuthorizationTcpPatterns } from '@krgeobuk/authorization/tcp/patterns';
import {
  TcpCheckPermission,
  TcpCheckRole,
  TcpGetUserRoles,
  TcpGetUserPermissions,
  TcpGetUserRoleNames,
  TcpGetUserPermissionActions,
} from '@krgeobuk/authorization/tcp';
import { PermissionCheckResponse, RoleCheckResponse } from '@krgeobuk/shared/authorization';
import type { Service } from '@krgeobuk/shared/service';

import { AuthorizationService } from './authorization.service.js';

@Controller()
export class AuthorizationTcpController {
  private readonly logger = new Logger(AuthorizationTcpController.name);

  constructor(private readonly authorizationService: AuthorizationService) {}

  // ==================== 권한 체크 패턴 ====================

  @MessagePattern(AuthorizationTcpPatterns.CHECK_PERMISSION)
  async checkPermission(@Payload() data: TcpCheckPermission): Promise<PermissionCheckResponse> {
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
  async checkRole(@Payload() data: TcpCheckRole): Promise<RoleCheckResponse> {
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
  async getUserPermissions(@Payload() data: TcpGetUserPermissions): Promise<string[]> {
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
  async getUserRoles(@Payload() data: TcpGetUserRoles): Promise<string[]> {
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

  @MessagePattern(AuthorizationTcpPatterns.GET_USER_ROLE_NAMES)
  async getUserRoleNames(@Payload() data: TcpGetUserRoleNames): Promise<string[]> {
    try {
      this.logger.debug('TCP user role names requested', {
        userId: data.userId,
        serviceId: data.serviceId,
      });

      const roleNames = await this.authorizationService.getUserRoleNames(
        data.userId,
        data.serviceId
      );

      this.logger.debug('TCP user role names retrieved', {
        userId: data.userId,
        serviceId: data.serviceId,
        roleNameCount: roleNames.length,
      });

      return roleNames;
    } catch (error: unknown) {
      this.logger.error('TCP user role names retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        serviceId: data.serviceId,
      });
      throw error;
    }
  }

  @MessagePattern(AuthorizationTcpPatterns.GET_USER_PERMISSION_ACTIONS)
  async getUserPermissionActions(
    @Payload() data: TcpGetUserPermissionActions
  ): Promise<string[]> {
    try {
      this.logger.debug('TCP user permission actions requested', {
        userId: data.userId,
        serviceId: data.serviceId,
      });

      const actions = await this.authorizationService.getUserPermissionActions(
        data.userId,
        data.serviceId
      );

      this.logger.debug('TCP user permission actions retrieved', {
        userId: data.userId,
        serviceId: data.serviceId,
        actionCount: actions.length,
      });

      return actions;
    } catch (error: unknown) {
      this.logger.error('TCP user permission actions retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        serviceId: data.serviceId,
      });
      throw error;
    }
  }

  // ==================== 사용 가능한 서비스 조회 패턴 ====================

  @MessagePattern(AuthorizationTcpPatterns.GET_AVAILABLE_SERVICES)
  async getAvailableServices(@Payload() data: { userId: string }): Promise<Service[]> {
    try {
      this.logger.debug('TCP available services requested', {
        userId: data.userId,
      });

      const availableServices = await this.authorizationService.getAvailableServices(data.userId);

      this.logger.debug('TCP available services retrieved', {
        userId: data.userId,
        serviceCount: availableServices.length,
      });

      return availableServices;
    } catch (error: unknown) {
      this.logger.error('TCP available services retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
      });

      // 에러 발생 시 빈 배열 반환 (fallback)
      return [];
    }
  }
}
