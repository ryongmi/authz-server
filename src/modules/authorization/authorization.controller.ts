import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
  ForbiddenException,
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
import { CurrentJwt } from '@krgeobuk/jwt/decorators';
import { GLOBAL_ROLES, isAdminLevelRole } from '@krgeobuk/core/constants';
import { SERVICE_CONSTANTS } from '@krgeobuk/core/constants';
import type { AuthenticatedJwt } from '@krgeobuk/jwt/interfaces';
import { Serialize } from '@krgeobuk/core/decorators';
import { AuthorizationResponse } from '@krgeobuk/authorization/response';
import { AuthorizationError } from '@krgeobuk/authorization/exception';
import { CheckPermissionDto, CheckRoleDto } from '@krgeobuk/authorization/dtos';
import { PermissionCheckResponseDto, RoleCheckResponseDto } from '@krgeobuk/shared/authorization';
import { UserIdParamsDto } from '@krgeobuk/shared/user';

import { AuthorizationService } from './authorization.service.js';

@SwaggerApiTags({ tags: ['authorization'] })
@SwaggerApiBearerAuth()
@UseGuards(AccessTokenGuard, AuthorizationGuard)
@Controller('authorization')
export class AuthorizationController {
  constructor(private readonly authorizationService: AuthorizationService) {}

  // ==================== 권한 체크 API ====================

  @Post('check-permission')
  @HttpCode(AuthorizationResponse.CHECK_PERMISSION_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '사용자 권한 확인',
    description: '사용자가 특정 액션에 대한 권한을 가지고 있는지 확인합니다.',
  })
  @SwaggerApiBody({
    description: '권한 확인 요청 데이터',
    dto: CheckPermissionDto,
  })
  @SwaggerApiOkResponse({
    status: AuthorizationResponse.CHECK_PERMISSION_SUCCESS.statusCode,
    description: AuthorizationResponse.CHECK_PERMISSION_SUCCESS.message,
    dto: PermissionCheckResponseDto,
  })
  @SwaggerApiErrorResponse({
    status: AuthorizationError.SERVICE_UNAVAILABLE.statusCode,
    description: AuthorizationError.SERVICE_UNAVAILABLE.message,
  })
  @RequireAccess({
    permissions: [AUTHZ_PERMISSIONS.AUTHORIZATION_CHECK],
    roles: [GLOBAL_ROLES.SUPER_ADMIN],
    combinationOperator: 'OR',
  })
  @Serialize({
    dto: PermissionCheckResponseDto,
    ...AuthorizationResponse.CHECK_PERMISSION_SUCCESS,
  })
  async checkPermission(
    @Body() dto: CheckPermissionDto,
    @CurrentJwt() jwt: AuthenticatedJwt
  ): Promise<PermissionCheckResponseDto> {
    // 본인의 권한 확인이거나 관리자인 경우만 허용
    if (dto.userId !== jwt.userId) {
      // 본인이 아닌 경우 관리자 권한 확인
      const userRoles = await this.authorizationService.getUserRoles(jwt.userId);
      if (!userRoles.some((role) => isAdminLevelRole(role))) {
        throw new ForbiddenException('본인의 권한만 확인할 수 있습니다.');
      }
    }
    const hasPermission = await this.authorizationService.checkUserPermission(dto);

    return { hasPermission };
  }

  @Post('check-role')
  @HttpCode(AuthorizationResponse.CHECK_ROLE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '사용자 역할 확인',
    description: '사용자가 특정 역할을 가지고 있는지 확인합니다.',
  })
  @SwaggerApiBody({
    description: '역할 확인 요청 데이터',
    dto: CheckRoleDto,
  })
  @SwaggerApiOkResponse({
    status: AuthorizationResponse.CHECK_ROLE_SUCCESS.statusCode,
    description: AuthorizationResponse.CHECK_ROLE_SUCCESS.message,
    dto: RoleCheckResponseDto,
  })
  @SwaggerApiErrorResponse({
    status: AuthorizationError.SERVICE_UNAVAILABLE.statusCode,
    description: AuthorizationError.SERVICE_UNAVAILABLE.message,
  })
  @RequireAccess({
    permissions: [AUTHZ_PERMISSIONS.AUTHORIZATION_CHECK],
    roles: [GLOBAL_ROLES.SUPER_ADMIN],
    combinationOperator: 'OR',
  })
  @Serialize({
    dto: RoleCheckResponseDto,
    ...AuthorizationResponse.CHECK_ROLE_SUCCESS,
  })
  async checkRole(
    @Body() dto: CheckRoleDto,
    @CurrentJwt() jwt: AuthenticatedJwt
  ): Promise<RoleCheckResponseDto> {
    // 본인의 역할 확인이거나 관리자인 경우만 허용
    if (dto.userId !== jwt.userId) {
      // 본인이 아닌 경우 관리자 권한 확인
      const userRoles = await this.authorizationService.getUserRoles(jwt.userId);
      if (!userRoles.some((role) => isAdminLevelRole(role))) {
        throw new ForbiddenException('본인의 역할만 확인할 수 있습니다.');
      }
    }
    const hasRole = await this.authorizationService.checkUserRole(dto);

    return { hasRole };
  }

  // ==================== 사용자 권한/역할 조회 API ====================

  @Get('users/:userId/permissions')
  @HttpCode(AuthorizationResponse.GET_USER_PERMISSIONS_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '사용자 권한 목록 조회',
    description: '사용자가 가진 모든 권한 목록을 조회합니다.',
  })
  @SwaggerApiParam({
    name: 'userId',
    type: String,
    description: '사용자 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: AuthorizationResponse.GET_USER_PERMISSIONS_SUCCESS.statusCode,
    description: AuthorizationResponse.GET_USER_PERMISSIONS_SUCCESS.message,
    type: 'string',
    isArray: true,
  })
  @SwaggerApiErrorResponse({
    status: AuthorizationError.SERVICE_UNAVAILABLE.statusCode,
    description: AuthorizationError.SERVICE_UNAVAILABLE.message,
  })
  @RequireAccess({
    permissions: [AUTHZ_PERMISSIONS.AUTHORIZATION_MANAGE],
    roles: [GLOBAL_ROLES.SUPER_ADMIN],
    combinationOperator: 'OR',
  })
  @Serialize({
    ...AuthorizationResponse.GET_USER_PERMISSIONS_SUCCESS,
  })
  async getUserPermissions(@Param() params: UserIdParamsDto): Promise<string[]> {
    return this.authorizationService.getUserPermissions(params.userId);
  }

  @Get('users/:userId/roles')
  @HttpCode(AuthorizationResponse.GET_USER_ROLES_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '사용자 역할 목록 조회',
    description: '사용자가 가진 모든 역할 목록을 조회합니다.',
  })
  @SwaggerApiParam({
    name: 'userId',
    type: String,
    description: '사용자 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: AuthorizationResponse.GET_USER_ROLES_SUCCESS.statusCode,
    description: AuthorizationResponse.GET_USER_ROLES_SUCCESS.message,
    type: 'string',
    isArray: true,
  })
  @SwaggerApiErrorResponse({
    status: AuthorizationError.SERVICE_UNAVAILABLE.statusCode,
    description: AuthorizationError.SERVICE_UNAVAILABLE.message,
  })
  @RequireAccess({
    permissions: [AUTHZ_PERMISSIONS.AUTHORIZATION_MANAGE],
    roles: [GLOBAL_ROLES.SUPER_ADMIN],
    combinationOperator: 'OR',
  })
  @Serialize({
    ...AuthorizationResponse.GET_USER_ROLES_SUCCESS,
  })
  async getUserRoles(@Param() params: UserIdParamsDto): Promise<string[]> {
    return this.authorizationService.getUserRoles(params.userId);
  }
}
