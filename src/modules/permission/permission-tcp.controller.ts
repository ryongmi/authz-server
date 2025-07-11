import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import type {
  PermissionSearchQuery,
  PermissionPaginatedSearchResult,
  PermissionDetail,
  CreatePermission,
  UpdatePermission,
} from '@krgeobuk/permission/interfaces';

import { PermissionEntity } from './entities/permission.entity.js';
import { PermissionService } from './permission.service.js';

/**
 * Permission 도메인 TCP 마이크로서비스 컨트롤러
 * 다른 서비스들이 authz-server의 권한 정보에 접근할 때 사용
 */
@Controller()
export class PermissionTcpController {
  private readonly logger = new Logger(PermissionTcpController.name);

  constructor(private readonly permissionService: PermissionService) {}

  /**
   * 권한 목록 검색 및 페이지네이션
   */
  @MessagePattern('permission.search')
  async searchPermissions(
    @Payload() query: PermissionSearchQuery
  ): Promise<PermissionPaginatedSearchResult> {
    this.logger.debug('TCP permission search request received', {
      serviceId: query.serviceId,
      hasActionFilter: !!query.action,
      page: query.page,
      limit: query.limit,
    });

    try {
      const result = await this.permissionService.searchPermissions(query);
      this.logger.log(
        `TCP permission search completed: ${result.items.length}/${result.pageInfo.totalItems} permissions`
      );
      return result;
    } catch (error: unknown) {
      this.logger.error('TCP permission search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: query.serviceId,
      });
      throw error;
    }
  }

  /**
   * 새로운 권한 생성
   */
  @MessagePattern('permission.create')
  async createPermission(@Payload() data: CreatePermission): Promise<{ success: boolean }> {
    this.logger.log('TCP permission creation requested', {
      action: data.action,
      serviceId: data.serviceId,
    });

    try {
      await this.permissionService.createPermission(data);
      this.logger.log(`TCP permission created successfully: ${data.action}`);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP permission creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        action: data.action,
        serviceId: data.serviceId,
      });
      throw error;
    }
  }

  /**
   * 권한 ID로 상세 정보 조회
   */
  @MessagePattern('permission.findById')
  async findPermissionById(
    @Payload() data: { permissionId: string }
  ): Promise<PermissionDetail | null> {
    this.logger.debug(`TCP permission detail request: ${data.permissionId}`);

    try {
      const permission = await this.permissionService.getPermissionById(data.permissionId);
      this.logger.debug(`TCP permission detail response: ${permission.action}`);
      return permission;
    } catch (error: unknown) {
      this.logger.debug('TCP permission not found or error occurred', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionId: data.permissionId,
      });
      return null;
    }
  }

  /**
   * 권한 정보 수정
   */
  @MessagePattern('permission.update')
  async updatePermission(
    @Payload() data: { permissionId: string; updateData: UpdatePermission }
  ): Promise<{ success: boolean }> {
    this.logger.log('TCP permission update requested', { permissionId: data.permissionId });

    try {
      await this.permissionService.updatePermission(data.permissionId, data.updateData);
      this.logger.log(`TCP permission updated successfully: ${data.permissionId}`);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP permission update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionId: data.permissionId,
      });
      throw error;
    }
  }

  /**
   * 권한 삭제 (소프트 삭제)
   */
  @MessagePattern('permission.delete')
  async deletePermission(@Payload() data: { permissionId: string }): Promise<{ success: boolean }> {
    this.logger.log('TCP permission deletion requested', { permissionId: data.permissionId });

    try {
      await this.permissionService.deletePermission(data.permissionId);
      this.logger.log(`TCP permission deleted successfully: ${data.permissionId}`);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP permission deletion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionId: data.permissionId,
      });
      throw error;
    }
  }

  /**
   * 서비스 ID로 권한 목록 조회
   */
  @MessagePattern('permission.findByServiceIds')
  async findPermissionsByServiceIds(
    @Payload() data: { serviceIds: string[] }
  ): Promise<PermissionEntity[]> {
    this.logger.debug('TCP permissions by services request', {
      serviceCount: data.serviceIds.length,
    });

    try {
      const permissions = await this.permissionService.findByServiceIds(data.serviceIds);
      this.logger.debug(
        `TCP found ${permissions.length} permissions for ${data.serviceIds.length} services`
      );
      return permissions;
    } catch (error: unknown) {
      this.logger.error('TCP permissions by services failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceCount: data.serviceIds.length,
      });
      throw error;
    }
  }

  /**
   * 권한 존재 여부 확인
   */
  @MessagePattern('permission.exists')
  async checkPermissionExists(@Payload() data: { permissionId: string }): Promise<boolean> {
    this.logger.debug(`TCP permission existence check: ${data.permissionId}`);

    try {
      const permission = await this.permissionService.findById(data.permissionId);
      const exists = !!permission;
      this.logger.debug(`TCP permission exists: ${exists}`);
      return exists;
    } catch (error: unknown) {
      this.logger.error('TCP permission existence check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionId: data.permissionId,
      });
      return false;
    }
  }
}

