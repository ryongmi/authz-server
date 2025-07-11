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

import { Serialize } from '@krgeobuk/core/decorators';
import {
  SwaggerApiTags,
  SwaggerApiOperation,
  SwaggerApiBearerAuth,
  SwaggerApiBody,
  SwaggerApiParam,
  SwaggerApiOkResponse,
  SwaggerApiErrorResponse,
} from '@krgeobuk/swagger/decorators';
import { JwtPayload } from '@krgeobuk/jwt/interfaces';
import { CurrentJwt } from '@krgeobuk/jwt/decorators';
import { AccessTokenGuard } from '@krgeobuk/jwt/guards';
import { PermissionIdParamsDto } from '@krgeobuk/shared/permission/dtos';
import { RoleIdParamsDto } from '@krgeobuk/shared/role/dtos';
import { RolePermissionParamsDto } from '@krgeobuk/shared/role-permission/dtos';
import { PermissionIdsDto } from '@krgeobuk/authz-relations/role-permission/dtos';
import {
  RolePermissionResponse,
  RolePermissionError,
} from '@krgeobuk/authz-relations/role-permission';

import { RolePermissionService } from './role-permission.service.js';

// 중간테이블 특성에 맞는 RESTful API 설계
@SwaggerApiTags({ tags: ['role-permissions'] })
@SwaggerApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller()
export class RolePermissionController {
  constructor(private readonly rolePermissionService: RolePermissionService) {}

  // ==================== 조회 API ====================

  @Get('roles/:roleId/permissions')
  @SwaggerApiOperation({
    summary: '역할의 권한 ID 목록 조회',
    description: '특정 역할에 할당된 권한 ID 목록을 조회합니다.',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.FETCH_SUCCESS.statusCode,
    description: RolePermissionResponse.FETCH_SUCCESS.message,
    type: 'string',
    isArray: true,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.ROLE_PERMISSION_FETCH_ERROR.statusCode,
    description: RolePermissionError.ROLE_PERMISSION_FETCH_ERROR.message,
  })
  @Serialize({
    ...RolePermissionResponse.FETCH_SUCCESS,
  })
  async getPermissionIdsByRoleId(
    @Param() params: RoleIdParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<string[]> {
    return this.rolePermissionService.getPermissionIds(params.roleId);
  }

  @Get('permissions/:permissionId/roles')
  @SwaggerApiOperation({
    summary: '권한의 역할 ID 목록 조회',
    description: '특정 권한을 가진 역할 ID 목록을 조회합니다.',
  })
  @SwaggerApiParam({
    name: 'permissionId',
    type: String,
    description: '권한 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.FETCH_SUCCESS.statusCode,
    description: RolePermissionResponse.FETCH_SUCCESS.message,
    type: 'string',
    isArray: true,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.ROLE_PERMISSION_FETCH_ERROR.statusCode,
    description: RolePermissionError.ROLE_PERMISSION_FETCH_ERROR.message,
  })
  @Serialize({
    ...RolePermissionResponse.FETCH_SUCCESS,
  })
  async getRoleIdsByPermissionId(
    @Param() params: PermissionIdParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<string[]> {
    return this.rolePermissionService.getRoleIds(params.permissionId);
  }

  @Get('roles/:roleId/permissions/:permissionId/exists')
  @SwaggerApiOperation({
    summary: '역할-권한 관계 존재 확인',
    description: '특정 역할이 특정 권한을 가지고 있는지 확인합니다.',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiParam({
    name: 'permissionId',
    type: String,
    description: '권한 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.FETCH_SUCCESS.statusCode,
    description: RolePermissionResponse.FETCH_SUCCESS.message,
    type: 'boolean',
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.ROLE_PERMISSION_FETCH_ERROR.statusCode,
    description: RolePermissionError.ROLE_PERMISSION_FETCH_ERROR.message,
  })
  @Serialize({
    ...RolePermissionResponse.FETCH_SUCCESS,
  })
  async checkRolePermissionExists(
    @Param() params: RolePermissionParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<boolean> {
    return this.rolePermissionService.exists(params.roleId, params.permissionId);
  }

  // ==================== 변경 API ====================

  @Post('roles/:roleId/permissions/:permissionId')
  @HttpCode(RolePermissionResponse.ASSIGN_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '역할에 권한 할당',
    description: '특정 역할에 특정 권한을 할당합니다.',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiParam({
    name: 'permissionId',
    type: String,
    description: '권한 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.ASSIGN_SUCCESS.statusCode,
    description: RolePermissionResponse.ASSIGN_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.ROLE_PERMISSION_ASSIGN_ERROR.statusCode,
    description: RolePermissionError.ROLE_PERMISSION_ASSIGN_ERROR.message,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.ROLE_PERMISSION_ALREADY_EXISTS.statusCode,
    description: RolePermissionError.ROLE_PERMISSION_ALREADY_EXISTS.message,
  })
  @Serialize({
    ...RolePermissionResponse.ASSIGN_SUCCESS,
  })
  async assignRolePermission(
    @Param() params: RolePermissionParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.assignRolePermission(params);
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @HttpCode(RolePermissionResponse.REVOKE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '역할 권한 해제',
    description: '역할에서 특정 권한을 해제합니다.',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiParam({
    name: 'permissionId',
    type: String,
    description: '권한 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.REVOKE_SUCCESS.statusCode,
    description: RolePermissionResponse.REVOKE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.ROLE_PERMISSION_NOT_FOUND.statusCode,
    description: RolePermissionError.ROLE_PERMISSION_NOT_FOUND.message,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.ROLE_PERMISSION_REVOKE_ERROR.statusCode,
    description: RolePermissionError.ROLE_PERMISSION_REVOKE_ERROR.message,
  })
  async revokeRolePermission(
    @Param() params: RolePermissionParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.revokeRolePermission(params.roleId, params.permissionId);
  }

  // ==================== 배치 처리 API ====================

  @Post('roles/:roleId/permissions/batch')
  @HttpCode(RolePermissionResponse.ASSIGN_MULTIPLE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '역할에 여러 권한 할당',
    description: '특정 역할에 여러 권한을 한번에 할당합니다.',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiBody({
    dto: PermissionIdsDto,
    description: '할당할 권한 ID 목록',
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.ASSIGN_MULTIPLE_SUCCESS.statusCode,
    description: RolePermissionResponse.ASSIGN_MULTIPLE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.ASSIGN_MULTIPLE_ERROR.statusCode,
    description: RolePermissionError.ASSIGN_MULTIPLE_ERROR.message,
  })
  @Serialize({
    ...RolePermissionResponse.ASSIGN_MULTIPLE_SUCCESS,
  })
  async assignMultiplePermissions(
    @Param() params: RoleIdParamsDto,
    @Body() dto: PermissionIdsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.assignMultiplePermissions({
      roleId: params.roleId,
      permissionIds: dto.permissionIds,
    });
  }

  @Delete('roles/:roleId/permissions/batch')
  @HttpCode(RolePermissionResponse.REVOKE_MULTIPLE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '역할에서 여러 권한 해제',
    description: '특정 역할에서 여러 권한을 한번에 해제합니다.',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiBody({
    dto: PermissionIdsDto,
    description: '해제할 권한 ID 목록',
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.REVOKE_MULTIPLE_SUCCESS.statusCode,
    description: RolePermissionResponse.REVOKE_MULTIPLE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.REVOKE_MULTIPLE_ERROR.statusCode,
    description: RolePermissionError.REVOKE_MULTIPLE_ERROR.message,
  })
  @Serialize({
    ...RolePermissionResponse.REVOKE_MULTIPLE_SUCCESS,
  })
  async revokeMultiplePermissions(
    @Param() params: RoleIdParamsDto,
    @Body() dto: PermissionIdsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.revokeMultiplePermissions({
      roleId: params.roleId,
      permissionIds: dto.permissionIds,
    });
  }

  @Put('roles/:roleId/permissions')
  @HttpCode(RolePermissionResponse.REPLACE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '역할 권한 완전 교체',
    description: '특정 역할의 모든 권한을 새로운 권한들로 교체합니다.',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiBody({
    dto: PermissionIdsDto,
    description: '새로운 권한 ID 목록 (기존 권한은 모두 제거됨)',
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.REPLACE_SUCCESS.statusCode,
    description: RolePermissionResponse.REPLACE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.REPLACE_ERROR.statusCode,
    description: RolePermissionError.REPLACE_ERROR.message,
  })
  @Serialize({
    ...RolePermissionResponse.REPLACE_SUCCESS,
  })
  async replaceRolePermissions(
    @Param() params: RoleIdParamsDto,
    @Body() dto: PermissionIdsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.replaceRolePermissions({
      roleId: params.roleId,
      permissionIds: dto.permissionIds,
    });
  }
}
