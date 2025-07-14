import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { TcpOperationResponse } from '@krgeobuk/core/interfaces';
import type { TcpServiceParams } from '@krgeobuk/service/tcp/interfaces';
import type { TcpRoleParams } from '@krgeobuk/role/tcp/interfaces';
import {
  ServiceVisibleRoleTcpPatterns,
  type TcpServiceVisibleRoleParams,
  type TcpServiceRoleBatch,
} from '@krgeobuk/service-visible-role/tcp';

import { ServiceVisibleRoleService } from './service-visible-role.service.js';

@Controller()
export class ServiceVisibleRoleTcpController {
  private readonly logger = new Logger(ServiceVisibleRoleTcpController.name);

  constructor(private readonly svrService: ServiceVisibleRoleService) {}

  // ==================== 조회 메서드 (양방향 관계 조회) ====================

  @MessagePattern(ServiceVisibleRoleTcpPatterns.FIND_ROLES_BY_SERVICE)
  async findRoleIdsByServiceId(@Payload() data: TcpServiceParams): Promise<string[]> {
    try {
      this.logger.debug('TCP service-visible-role find roles by service requested', {
        serviceId: data.serviceId,
      });
      return await this.svrService.getRoleIds(data.serviceId);
    } catch (error: unknown) {
      this.logger.error('TCP service-visible-role find roles by service failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: data.serviceId,
      });
      throw error;
    }
  }

  @MessagePattern(ServiceVisibleRoleTcpPatterns.FIND_SERVICES_BY_ROLE)
  async findServiceIdsByRoleId(@Payload() data: TcpRoleParams): Promise<string[]> {
    try {
      this.logger.debug('TCP service-visible-role find services by role requested', {
        roleId: data.roleId,
      });
      return await this.svrService.getServiceIds(data.roleId);
    } catch (error: unknown) {
      this.logger.error('TCP service-visible-role find services by role failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: data.roleId,
      });
      throw error;
    }
  }

  // ==================== 존재 확인 ====================

  @MessagePattern(ServiceVisibleRoleTcpPatterns.EXISTS)
  async checkServiceVisibleRoleExists(
    @Payload() data: TcpServiceVisibleRoleParams
  ): Promise<boolean> {
    try {
      this.logger.debug('TCP service-visible-role exists check requested', {
        serviceId: data.serviceId,
        roleId: data.roleId,
      });
      return await this.svrService.exists(data.serviceId, data.roleId);
    } catch (error: unknown) {
      this.logger.error('TCP service-visible-role exists check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: data.serviceId,
        roleId: data.roleId,
      });
      throw error;
    }
  }

  // ==================== 배치 처리 (할당 → 교체) ====================

  @MessagePattern(ServiceVisibleRoleTcpPatterns.ASSIGN_MULTIPLE_ROLES)
  async assignMultipleRoles(@Payload() data: TcpServiceRoleBatch): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP service-visible-role assign multiple roles requested', {
        serviceId: data.serviceId,
        roleCount: data.roleIds.length,
      });
      await this.svrService.assignMultipleRoles(data.serviceId, data.roleIds);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP service-visible-role assign multiple roles failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: data.serviceId,
        roleCount: data.roleIds.length,
      });
      throw error;
    }
  }

  @MessagePattern(ServiceVisibleRoleTcpPatterns.REVOKE_MULTIPLE_ROLES)
  async revokeMultipleRoles(@Payload() data: TcpServiceRoleBatch): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP service-visible-role revoke multiple roles requested', {
        serviceId: data.serviceId,
        roleCount: data.roleIds.length,
      });
      await this.svrService.revokeMultipleRoles(data.serviceId, data.roleIds);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP service-visible-role revoke multiple roles failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: data.serviceId,
        roleCount: data.roleIds.length,
      });
      throw error;
    }
  }

  @MessagePattern(ServiceVisibleRoleTcpPatterns.REPLACE_SERVICE_ROLES)
  async replaceServiceRoles(@Payload() data: TcpServiceRoleBatch): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP service-visible-role replace service roles requested', {
        serviceId: data.serviceId,
        newRoleCount: data.roleIds.length,
      });
      await this.svrService.replaceServiceRoles(data);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP service-visible-role replace service roles failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: data.serviceId,
        newRoleCount: data.roleIds.length,
      });
      throw error;
    }
  }
}

