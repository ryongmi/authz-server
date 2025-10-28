import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import {
  SwaggerApiTags,
  SwaggerApiOperation,
  SwaggerApiBearerAuth,
  SwaggerApiBody,
  SwaggerApiParam,
  SwaggerApiOkResponse,
  SwaggerApiErrorResponse,
} from '@krgeobuk/swagger/decorators';
import { AccessTokenGuard } from '@krgeobuk/jwt/guards';
import { AuthorizationGuard } from '@krgeobuk/authorization/guards';
import { RequireAccess } from '@krgeobuk/authorization/decorators';
import { AUTHZ_PERMISSIONS } from '@krgeobuk/authorization/constants';
import { Serialize } from '@krgeobuk/core/decorators';
import { SERVICE_CONSTANTS, GLOBAL_ROLES } from '@krgeobuk/core/constants';
import { ServiceVisibleRoleParamsDto } from '@krgeobuk/shared/service-visible-role';
import { ServiceIdParamsDto } from '@krgeobuk/shared/service';
import { RoleIdParamsDto } from '@krgeobuk/shared/role';
import { RoleIdsDto } from '@krgeobuk/service-visible-role/dtos';
import { ServiceVisibleRoleResponse } from '@krgeobuk/service-visible-role/response';
import { ServiceVisibleRoleError } from '@krgeobuk/service-visible-role/exception';

import { ServiceVisibleRoleService } from './service-visible-role.service.js';

@SwaggerApiTags({ tags: ['service-visible-roles'] })
@SwaggerApiBearerAuth()
@UseGuards(AccessTokenGuard, AuthorizationGuard)
@Controller()
export class ServiceVisibleRoleController {
  constructor(private readonly svrService: ServiceVisibleRoleService) {}

  // ==================== 조회 API ====================

  @Get('services/:serviceId/roles')
  @HttpCode(ServiceVisibleRoleResponse.FETCH_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '서비스의 역할 ID 목록 조회',
    description: '특정 서비스에 할당된 역할 ID 목록을 조회합니다.',
  })
  @SwaggerApiParam({
    name: 'serviceId',
    type: String,
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: ServiceVisibleRoleResponse.FETCH_SUCCESS.statusCode,
    description: ServiceVisibleRoleResponse.FETCH_SUCCESS.message,
    type: 'string',
    isArray: true,
  })
  @SwaggerApiErrorResponse({
    status: ServiceVisibleRoleError.FETCH_ERROR.statusCode,
    description: ServiceVisibleRoleError.FETCH_ERROR.message,
  })
  @RequireAccess({
    permissions: [AUTHZ_PERMISSIONS.SERVICE_VISIBLE_ROLE_MANAGE],
    roles: [GLOBAL_ROLES.SUPER_ADMIN],
    combinationOperator: 'OR',
  })
  @Serialize({
    ...ServiceVisibleRoleResponse.FETCH_SUCCESS,
  })
  async getRoleIdsByServiceId(@Param() params: ServiceIdParamsDto): Promise<string[]> {
    return this.svrService.getRoleIds(params.serviceId);
  }

  @Get('roles/:roleId/services')
  @SwaggerApiOperation({
    summary: '역할의 서비스 ID 목록 조회',
    description: '특정 역할에 할당된 서비스 ID 목록을 조회합니다.',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: ServiceVisibleRoleResponse.FETCH_SUCCESS.statusCode,
    description: ServiceVisibleRoleResponse.FETCH_SUCCESS.message,
    type: 'string',
    isArray: true,
  })
  @SwaggerApiErrorResponse({
    status: ServiceVisibleRoleError.FETCH_ERROR.statusCode,
    description: ServiceVisibleRoleError.FETCH_ERROR.message,
  })
  @RequireAccess({
    permissions: [AUTHZ_PERMISSIONS.SERVICE_VISIBLE_ROLE_MANAGE],
    roles: [GLOBAL_ROLES.SUPER_ADMIN],
    combinationOperator: 'OR',
  })
  @Serialize({
    ...ServiceVisibleRoleResponse.FETCH_SUCCESS,
  })
  async getServiceIdsByRoleId(@Param() params: RoleIdParamsDto): Promise<string[]> {
    return this.svrService.getServiceIds(params.roleId);
  }

  @Get('services/:serviceId/roles/:roleId/exists')
  @SwaggerApiOperation({
    summary: '서비스-역할 관계 존재 확인',
    description: '특정 서비스와 역할 간의 관계가 존재하는지 확인합니다.',
  })
  @SwaggerApiParam({
    name: 'serviceId',
    type: String,
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: ServiceVisibleRoleResponse.FETCH_SUCCESS.statusCode,
    description: ServiceVisibleRoleResponse.FETCH_SUCCESS.message,
    type: Boolean,
  })
  @SwaggerApiErrorResponse({
    status: ServiceVisibleRoleError.FETCH_ERROR.statusCode,
    description: ServiceVisibleRoleError.FETCH_ERROR.message,
  })
  @RequireAccess({
    permissions: [AUTHZ_PERMISSIONS.SERVICE_VISIBLE_ROLE_MANAGE],
    roles: [GLOBAL_ROLES.SUPER_ADMIN],
    combinationOperator: 'OR',
  })
  @Serialize({
    ...ServiceVisibleRoleResponse.FETCH_SUCCESS,
  })
  async checkServiceVisibleRoleExists(
    @Param() params: ServiceVisibleRoleParamsDto
  ): Promise<boolean> {
    return this.svrService.exists(params);
  }

  // ==================== 변경 API ====================

  @Post('services/:serviceId/roles/:roleId')
  @HttpCode(ServiceVisibleRoleResponse.ASSIGN_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '서비스에 역할 할당',
    description: '서비스에 새로운 역할을 할당합니다.',
  })
  @SwaggerApiParam({
    name: 'serviceId',
    type: String,
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: ServiceVisibleRoleResponse.ASSIGN_SUCCESS.statusCode,
    description: ServiceVisibleRoleResponse.ASSIGN_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: ServiceVisibleRoleError.ASSIGN_ERROR.statusCode,
    description: ServiceVisibleRoleError.ASSIGN_ERROR.message,
  })
  @SwaggerApiErrorResponse({
    status: ServiceVisibleRoleError.SERVICE_VISIBLE_ROLE_ALREADY_EXISTS.statusCode,
    description: ServiceVisibleRoleError.SERVICE_VISIBLE_ROLE_ALREADY_EXISTS.message,
  })
  @RequireAccess({
    permissions: [AUTHZ_PERMISSIONS.SERVICE_VISIBLE_ROLE_MANAGE],
    roles: [GLOBAL_ROLES.SUPER_ADMIN],
    combinationOperator: 'OR',
  })
  @Serialize({
    ...ServiceVisibleRoleResponse.ASSIGN_SUCCESS,
  })
  async assignServiceVisibleRole(@Param() params: ServiceVisibleRoleParamsDto): Promise<void> {
    await this.svrService.assignServiceVisibleRole(params);
  }

  @Delete('services/:serviceId/roles/:roleId')
  @HttpCode(ServiceVisibleRoleResponse.REVOKE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '서비스 역할 해제',
    description: '서비스에서 특정 역할을 해제합니다.',
  })
  @SwaggerApiParam({
    name: 'serviceId',
    type: String,
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: ServiceVisibleRoleResponse.REVOKE_SUCCESS.statusCode,
    description: ServiceVisibleRoleResponse.REVOKE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: ServiceVisibleRoleError.REVOKE_ERROR.statusCode,
    description: ServiceVisibleRoleError.REVOKE_ERROR.message,
  })
  @SwaggerApiErrorResponse({
    status: ServiceVisibleRoleError.SERVICE_VISIBLE_ROLE_NOT_FOUND.statusCode,
    description: ServiceVisibleRoleError.SERVICE_VISIBLE_ROLE_NOT_FOUND.message,
  })
  @RequireAccess({
    permissions: [AUTHZ_PERMISSIONS.SERVICE_VISIBLE_ROLE_MANAGE],
    roles: [GLOBAL_ROLES.SUPER_ADMIN],
    combinationOperator: 'OR',
  })
  @Serialize({
    ...ServiceVisibleRoleResponse.REVOKE_SUCCESS,
  })
  async revokeServiceVisibleRole(@Param() params: ServiceVisibleRoleParamsDto): Promise<void> {
    await this.svrService.revokeServiceVisibleRole(params);
  }

  // ==================== 배치 처리 API ====================

  @Post('services/:serviceId/roles/batch')
  @HttpCode(ServiceVisibleRoleResponse.ASSIGN_MULTIPLE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '서비스에 여러 역할 할당',
    description: '서비스에 여러 역할을 배치로 할당합니다.',
  })
  @SwaggerApiParam({
    name: 'serviceId',
    type: String,
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiBody({
    dto: RoleIdsDto,
    description: '할당할 역할 ID 목록',
  })
  @SwaggerApiOkResponse({
    status: ServiceVisibleRoleResponse.ASSIGN_MULTIPLE_SUCCESS.statusCode,
    description: ServiceVisibleRoleResponse.ASSIGN_MULTIPLE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: ServiceVisibleRoleError.ASSIGN_MULTIPLE_ERROR.statusCode,
    description: ServiceVisibleRoleError.ASSIGN_MULTIPLE_ERROR.message,
  })
  @RequireAccess({
    permissions: [AUTHZ_PERMISSIONS.SERVICE_VISIBLE_ROLE_MANAGE],
    roles: [GLOBAL_ROLES.SUPER_ADMIN],
    combinationOperator: 'OR',
  })
  @Serialize({
    ...ServiceVisibleRoleResponse.ASSIGN_MULTIPLE_SUCCESS,
  })
  async assignMultipleRoles(
    @Param() params: ServiceIdParamsDto,
    @Body() dto: RoleIdsDto
  ): Promise<void> {
    await this.svrService.assignMultipleRoles({
      serviceId: params.serviceId,
      roleIds: dto.roleIds,
    });
  }

  @Delete('services/:serviceId/roles/batch')
  @HttpCode(ServiceVisibleRoleResponse.REVOKE_MULTIPLE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '서비스에서 여러 역할 해제',
    description: '서비스에서 여러 역할을 배치로 해제합니다.',
  })
  @SwaggerApiParam({
    name: 'serviceId',
    type: String,
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiBody({
    dto: RoleIdsDto,
    description: '해제할 역할 ID 목록',
  })
  @SwaggerApiOkResponse({
    status: ServiceVisibleRoleResponse.REVOKE_MULTIPLE_SUCCESS.statusCode,
    description: ServiceVisibleRoleResponse.REVOKE_MULTIPLE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: ServiceVisibleRoleError.REVOKE_MULTIPLE_ERROR.statusCode,
    description: ServiceVisibleRoleError.REVOKE_MULTIPLE_ERROR.message,
  })
  @RequireAccess({
    permissions: [AUTHZ_PERMISSIONS.SERVICE_VISIBLE_ROLE_MANAGE],
    roles: [GLOBAL_ROLES.SUPER_ADMIN],
    combinationOperator: 'OR',
  })
  @Serialize({
    ...ServiceVisibleRoleResponse.REVOKE_MULTIPLE_SUCCESS,
  })
  async revokeMultipleRoles(
    @Param() params: ServiceIdParamsDto,
    @Body() dto: RoleIdsDto
  ): Promise<void> {
    await this.svrService.revokeMultipleRoles({
      serviceId: params.serviceId,
      roleIds: dto.roleIds,
    });
  }

  @Put('services/:serviceId/roles')
  @HttpCode(ServiceVisibleRoleResponse.REPLACE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '서비스 역할 완전 교체',
    description: '서비스의 모든 역할을 새로운 역할 목록으로 교체합니다.',
  })
  @SwaggerApiParam({
    name: 'serviceId',
    type: String,
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiBody({
    dto: RoleIdsDto,
    description: '새로운 역할 ID 목록',
  })
  @SwaggerApiOkResponse({
    status: ServiceVisibleRoleResponse.REPLACE_SUCCESS.statusCode,
    description: ServiceVisibleRoleResponse.REPLACE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: ServiceVisibleRoleError.REPLACE_ERROR.statusCode,
    description: ServiceVisibleRoleError.REPLACE_ERROR.message,
  })
  @RequireAccess({
    permissions: [AUTHZ_PERMISSIONS.SERVICE_VISIBLE_ROLE_MANAGE],
    roles: [GLOBAL_ROLES.SUPER_ADMIN],
    combinationOperator: 'OR',
  })
  @Serialize({
    ...ServiceVisibleRoleResponse.REPLACE_SUCCESS,
  })
  async replaceServiceRoles(
    @Param() params: ServiceIdParamsDto,
    @Body() dto: RoleIdsDto
  ): Promise<void> {
    await this.svrService.replaceServiceRoles({
      serviceId: params.serviceId,
      roleIds: dto.roleIds,
    });
  }
}
