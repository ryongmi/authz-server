import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { TcpOperationResponse, TcpSearchResponse } from '@krgeobuk/core/interfaces';
import type { RoleSearchQuery, RoleSearchResult, CreateRole } from '@krgeobuk/role/interfaces';
import { TcpRoleId, TcpMultiServiceIds, TcpRoleUpdate } from '@krgeobuk/role/tcp/interfaces';
import { RoleTcpPatterns } from '@krgeobuk/role/tcp/patterns';
import { Role } from '@krgeobuk/shared/role';

import { RoleService } from './role.service.js';

/**
 * Role 도메인 TCP 마이크로서비스 컨트롤러
 * 다른 서비스들이 authz-server의 역할 정보에 접근할 때 사용
 */
@Controller()
export class RoleTcpController {
  private readonly logger = new Logger(RoleTcpController.name);

  constructor(private readonly roleService: RoleService) {}

  /**
   * 역할 목록 검색 및 페이지네이션
   */
  @MessagePattern(RoleTcpPatterns.SEARCH)
  async searchRoles(
    @Payload() query: RoleSearchQuery
  ): Promise<TcpSearchResponse<RoleSearchResult>> {
    this.logger.debug('TCP role search request', {
      hasNameFilter: !!query.name,
      serviceId: query.serviceId,
    });

    try {
      const result = await this.roleService.searchRoles(query);
      this.logger.log('TCP role search completed', {
        resultCount: result.items.length,
        totalItems: result.pageInfo.totalItems,
      });
      return result;
    } catch (error: unknown) {
      this.logger.error('TCP role search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: query.serviceId,
      });
      throw error;
    }
  }

  /**
   * 역할 ID로 상세 정보 조회
   */
  @MessagePattern(RoleTcpPatterns.FIND_BY_ID)
  async findRoleById(@Payload() data: TcpRoleId): Promise<Role | null> {
    this.logger.debug(`TCP role detail request: ${data.roleId}`);

    try {
      const role = await this.roleService.findById(data.roleId);
      this.logger.debug(`TCP role findById response: ${role?.name || 'not found'}`);
      return role;
    } catch (error: unknown) {
      this.logger.error('TCP role detail failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: data.roleId,
      });
      throw error;
    }
  }

  /**
   * 여러 역할 ID로 역할 상세 정보 목록 검색
   */
  @MessagePattern(RoleTcpPatterns.FIND_BY_IDS)
  async findRolesByIds(@Payload() data: { roleIds: string[] }): Promise<Role[]> {
    this.logger.debug(`TCP role findByIds request: ${data.roleIds.length}`);

    try {
      const roles = await this.roleService.findByIds(data.roleIds);
      this.logger.debug(`TCP role findByIds response: ${roles.length || 'not found'}`);
      return roles;
    } catch (error: unknown) {
      this.logger.error('TCP role findByIds failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleCount: data.roleIds.length,
      });
      throw error;
    }
  }

  /**
   * 새로운 역할 생성
   */
  @MessagePattern(RoleTcpPatterns.CREATE)
  async createRole(@Payload() data: CreateRole): Promise<TcpOperationResponse> {
    this.logger.log('TCP role creation requested', {
      name: data.name,
      serviceId: data.serviceId,
    });

    try {
      await this.roleService.createRole(data);
      this.logger.log('TCP role creation completed', {
        name: data.name,
        serviceId: data.serviceId,
      });
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP role creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleName: data.name,
        serviceId: data.serviceId,
      });
      throw error;
    }
  }

  /**
   * 역할 정보 수정
   */
  @MessagePattern(RoleTcpPatterns.UPDATE)
  async updateRole(@Payload() data: TcpRoleUpdate): Promise<TcpOperationResponse> {
    this.logger.log('TCP role update requested', { roleId: data.roleId });

    try {
      await this.roleService.updateRole(data.roleId, data.updateData);
      this.logger.log('TCP role update completed', { roleId: data.roleId });
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP role update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: data.roleId,
      });
      throw error;
    }
  }

  /**
   * 역할 삭제 (소프트 삭제)
   */
  @MessagePattern(RoleTcpPatterns.DELETE)
  async deleteRole(@Payload() data: TcpRoleId): Promise<TcpOperationResponse> {
    this.logger.log('TCP role deletion requested', { roleId: data.roleId });

    try {
      await this.roleService.deleteRole(data.roleId);
      this.logger.log('TCP role deletion completed', { roleId: data.roleId });
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP role deletion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: data.roleId,
      });
      throw error;
    }
  }

  /**
   * 서비스 ID로 역할 목록 조회
   */
  @MessagePattern(RoleTcpPatterns.FIND_BY_SERVICE_IDS)
  async findRolesByServiceIds(@Payload() data: TcpMultiServiceIds): Promise<Role[]> {
    this.logger.debug('TCP roles by services request', {
      serviceCount: data.serviceIds.length,
    });

    try {
      const roles = await this.roleService.findByServiceIds(data.serviceIds);
      this.logger.debug(`TCP found ${roles.length} roles for ${data.serviceIds.length} services`);
      return roles;
    } catch (error: unknown) {
      this.logger.error('TCP roles by services failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceCount: data.serviceIds.length,
      });
      throw error;
    }
  }

  /**
   * 역할 존재 여부 확인
   */
  @MessagePattern(RoleTcpPatterns.EXISTS)
  async existsRole(@Payload() data: TcpRoleId): Promise<boolean> {
    this.logger.debug(`TCP role existence check: ${data.roleId}`);

    try {
      const role = await this.roleService.findById(data.roleId);
      const exists = !!role;
      this.logger.debug(`TCP role exists: ${exists}`);
      return exists;
    } catch (error: unknown) {
      this.logger.error('TCP role existence check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: data.roleId,
      });
      return false;
    }
  }
}
