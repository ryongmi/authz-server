import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
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

import {
  AssignRolePermissionDto,
  AssignMultiplePermissionsDto,
  RevokeMultiplePermissionsDto,
  ReplaceRolePermissionsDto,
} from '@krgeobuk/authz-relations/role-permission/dtos';
import {
  RolePermissionResponse,
  RolePermissionError,
} from '@krgeobuk/authz-relations/role-permission';

import { RolePermissionService } from './role-permission.service.js';

// 중간테이블 특성에 맞는 단순한 API 설계
@SwaggerApiTags({ tags: ['role-permissions'] })
@SwaggerApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('role-permissions')
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
    status: 200,
    description: '역할 권한 ID 목록 조회 성공',
    type: [String],
  })
  @SwaggerApiErrorResponse({ status: 404, description: '역할을 찾을 수 없음' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({
    ...RolePermissionResponse.FETCH_SUCCESS,
  })
  async getPermissionIdsByRoleId(
    @Param('roleId') roleId: string,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<string[]> {
    return this.rolePermissionService.findPermissionIdsByRoleId(roleId);
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
    status: 200,
    description: '권한 역할 ID 목록 조회 성공',
    type: [String],
  })
  @SwaggerApiErrorResponse({ status: 404, description: '권한을 찾을 수 없음' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({
    ...RolePermissionResponse.FETCH_SUCCESS,
  })
  async getRoleIdsByPermissionId(
    @Param('permissionId') permissionId: string,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<string[]> {
    return this.rolePermissionService.findRoleIdsByPermissionId(permissionId);
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
    status: 200,
    description: '관계 존재 확인 성공',
    type: Boolean,
  })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({
    ...RolePermissionResponse.FETCH_SUCCESS,
  })
  async checkRolePermissionExists(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<boolean> {
    return this.rolePermissionService.existsRolePermission(roleId, permissionId);
  }

  // ==================== 변경 API ====================

  @Post()
  @SwaggerApiOperation({
    summary: '역할에 권한 할당',
    description: '역할에 새로운 권한을 할당합니다.',
  })
  @SwaggerApiBody({ dto: AssignRolePermissionDto, description: '역할 권한 할당 데이터' })
  @SwaggerApiOkResponse({
    status: 201,
    description: '권한 할당 성공',
  })
  @SwaggerApiErrorResponse({ status: 400, description: '잘못된 요청 데이터' })
  @SwaggerApiErrorResponse({ status: 409, description: '이미 할당된 권한' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({
    ...RolePermissionResponse.ASSIGN_SUCCESS,
  })
  async assignRolePermission(
    @Body() dto: AssignRolePermissionDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.assignRolePermission(dto);
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @HttpCode(204)
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
  @SwaggerApiOkResponse({ status: 204, description: '권한 해제 성공' })
  @SwaggerApiErrorResponse({ status: 404, description: '역할 권한 관계를 찾을 수 없음' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  async revokeRolePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.revokeRolePermission(roleId, permissionId);
  }

  // ==================== 배치 처리 API ====================

  @Post('assign-multiple')
  @HttpCode(RolePermissionResponse.ASSIGN_MULTIPLE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '역할에 여러 권한 할당',
    description: '역할에 여러 권한을 한번에 할당합니다.',
  })
  @SwaggerApiBody({
    dto: AssignMultiplePermissionsDto,
    description: '여러 권한 할당 데이터',
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.ASSIGN_MULTIPLE_SUCCESS.statusCode,
    description: RolePermissionResponse.ASSIGN_MULTIPLE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.ASSIGN_MULTIPLE_ERROR.statusCode,
    description: RolePermissionError.ASSIGN_MULTIPLE_ERROR.message,
  })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({
    ...RolePermissionResponse.ASSIGN_MULTIPLE_SUCCESS,
  })
  async assignMultiplePermissions(
    @Body() dto: AssignMultiplePermissionsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.assignMultiplePermissions(dto);
  }

  @Post('revoke-multiple')
  @HttpCode(RolePermissionResponse.REVOKE_MULTIPLE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '역할에서 여러 권한 해제',
    description: '역할에서 여러 권한을 한번에 해제합니다.',
  })
  @SwaggerApiBody({
    dto: RevokeMultiplePermissionsDto,
    description: '여러 권한 해제 데이터',
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.REVOKE_MULTIPLE_SUCCESS.statusCode,
    description: RolePermissionResponse.REVOKE_MULTIPLE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.REVOKE_MULTIPLE_ERROR.statusCode,
    description: RolePermissionError.REVOKE_MULTIPLE_ERROR.message,
  })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({
    ...RolePermissionResponse.REVOKE_MULTIPLE_SUCCESS,
  })
  async revokeMultiplePermissions(
    @Body() dto: RevokeMultiplePermissionsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.revokeMultiplePermissions(dto);
  }

  @Post('replace-permissions')
  @HttpCode(RolePermissionResponse.REPLACE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '역할 권한 완전 교체',
    description: '역할의 모든 권한을 새로운 권한들로 교체합니다.',
  })
  @SwaggerApiBody({
    dto: ReplaceRolePermissionsDto,
    description: '권한 교체 데이터',
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.REPLACE_SUCCESS.statusCode,
    description: RolePermissionResponse.REPLACE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.REPLACE_ERROR.statusCode,
    description: RolePermissionError.REPLACE_ERROR.message,
  })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({
    ...RolePermissionResponse.REPLACE_SUCCESS,
  })
  async replaceRolePermissions(
    @Body() dto: ReplaceRolePermissionsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.replaceRolePermissions(dto);
  }
}