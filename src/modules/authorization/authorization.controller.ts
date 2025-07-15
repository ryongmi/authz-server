import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';

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
import { Serialize } from '@krgeobuk/core/decorators';
import { AuthorizationResponse } from '@krgeobuk/authorization/response';
import { AuthorizationError } from '@krgeobuk/authorization/exception';
import { CheckPermissionDto, CheckRoleDto } from '@krgeobuk/authorization/dtos';
import { PermissionCheckResponseDto, RoleCheckResponseDto } from '@krgeobuk/shared/authorization';
import { UserIdParamsDto } from '@krgeobuk/shared/user';

import { AuthorizationService } from './authorization.service.js';

@SwaggerApiTags({ tags: ['authorization'] })
@SwaggerApiBearerAuth()
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
  @UseGuards(AccessTokenGuard)
  @Serialize({
    dto: PermissionCheckResponseDto,
    ...AuthorizationResponse.CHECK_PERMISSION_SUCCESS,
  })
  async checkPermission(@Body() dto: CheckPermissionDto): Promise<PermissionCheckResponseDto> {
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
  @UseGuards(AccessTokenGuard)
  @Serialize({
    dto: RoleCheckResponseDto,
    ...AuthorizationResponse.CHECK_ROLE_SUCCESS,
  })
  async checkRole(@Body() dto: CheckRoleDto): Promise<RoleCheckResponseDto> {
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
  @UseGuards(AccessTokenGuard)
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
  @UseGuards(AccessTokenGuard)
  @Serialize({
    ...AuthorizationResponse.GET_USER_ROLES_SUCCESS,
  })
  async getUserRoles(@Param() params: UserIdParamsDto): Promise<string[]> {
    return this.authorizationService.getUserRoles(params.userId);
  }
}

