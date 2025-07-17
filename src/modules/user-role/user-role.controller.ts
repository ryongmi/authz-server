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
import { AccessTokenGuard } from '@krgeobuk/jwt/guards';
import { AuthorizationGuard } from '@krgeobuk/authorization/guards';
import { RequireRole } from '@krgeobuk/authorization/decorators';
import { UserIdParamsDto } from '@krgeobuk/shared/user/dtos';
import { RoleIdParamsDto } from '@krgeobuk/shared/role/dtos';
import { UserRoleParamsDto } from '@krgeobuk/shared/user-role/dtos';
import { RoleIdsDto } from '@krgeobuk/user-role/dtos';
import { UserRoleError } from '@krgeobuk/user-role/exception';
import { UserRoleResponse } from '@krgeobuk/user-role/response';

import { UserRoleService } from './user-role.service.js';

@SwaggerApiTags({ tags: ['user-roles'] })
@SwaggerApiBearerAuth()
@UseGuards(AccessTokenGuard, AuthorizationGuard)
@Controller()
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  // ==================== 조회 API ====================

  @Get('users/:userId/roles')
  @SwaggerApiOperation({
    summary: '사용자의 역할 ID 목록 조회',
    description: '특정 사용자에게 할당된 역할 ID 목록을 조회합니다.',
  })
  @SwaggerApiParam({
    name: 'userId',
    type: String,
    description: '사용자 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: UserRoleResponse.FETCH_SUCCESS.statusCode,
    description: UserRoleResponse.FETCH_SUCCESS.message,
    type: 'string',
    isArray: true,
  })
  @SwaggerApiErrorResponse({
    status: UserRoleError.FETCH_ERROR.statusCode,
    description: UserRoleError.FETCH_ERROR.message,
  })
  @RequireRole('superAdmin')
  @Serialize({
    ...UserRoleResponse.FETCH_SUCCESS,
  })
  async getRoleIdsByUserId(@Param() params: UserIdParamsDto): Promise<string[]> {
    return this.userRoleService.getRoleIds(params.userId);
  }

  @Get('roles/:roleId/users')
  @SwaggerApiOperation({
    summary: '역할의 사용자 ID 목록 조회',
    description: '특정 역할을 가진 사용자 ID 목록을 조회합니다.',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: UserRoleResponse.FETCH_SUCCESS.statusCode,
    description: UserRoleResponse.FETCH_SUCCESS.message,
    type: 'string',
    isArray: true,
  })
  @SwaggerApiErrorResponse({
    status: UserRoleError.FETCH_ERROR.statusCode,
    description: UserRoleError.FETCH_ERROR.message,
  })
  @RequireRole('superAdmin')
  @Serialize({
    ...UserRoleResponse.FETCH_SUCCESS,
  })
  async getUserIdsByRoleId(@Param() params: RoleIdParamsDto): Promise<string[]> {
    return this.userRoleService.getUserIds(params.roleId);
  }

  @Get('users/:userId/roles/:roleId/exists')
  @SwaggerApiOperation({
    summary: '사용자-역할 관계 존재 확인',
    description: '특정 사용자가 특정 역할을 가지고 있는지 확인합니다.',
  })
  @SwaggerApiParam({
    name: 'userId',
    type: String,
    description: '사용자 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: UserRoleResponse.FETCH_SUCCESS.statusCode,
    description: UserRoleResponse.FETCH_SUCCESS.message,
    type: 'boolean',
  })
  @SwaggerApiErrorResponse({
    status: UserRoleError.FETCH_ERROR.statusCode,
    description: UserRoleError.FETCH_ERROR.message,
  })
  @RequireRole('superAdmin')
  @Serialize({
    ...UserRoleResponse.FETCH_SUCCESS,
  })
  async checkUserRoleExists(@Param() params: UserRoleParamsDto): Promise<boolean> {
    return this.userRoleService.exists(params);
  }

  // ==================== 변경 API ====================

  @Post('users/:userId/roles/:roleId')
  @HttpCode(UserRoleResponse.ASSIGN_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '사용자에게 역할 할당',
    description: '특정 사용자에게 특정 역할을 할당합니다.',
  })
  @SwaggerApiParam({
    name: 'userId',
    type: String,
    description: '사용자 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: UserRoleResponse.ASSIGN_SUCCESS.statusCode,
    description: UserRoleResponse.ASSIGN_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: UserRoleError.ASSIGN_ERROR.statusCode,
    description: UserRoleError.ASSIGN_ERROR.message,
  })
  @SwaggerApiErrorResponse({
    status: UserRoleError.USER_ROLE_ALREADY_EXISTS.statusCode,
    description: UserRoleError.USER_ROLE_ALREADY_EXISTS.message,
  })
  @RequireRole('superAdmin')
  @Serialize({
    ...UserRoleResponse.ASSIGN_SUCCESS,
  })
  async assignUserRole(@Param() params: UserRoleParamsDto): Promise<void> {
    await this.userRoleService.assignUserRole(params);
  }

  @Delete('users/:userId/roles/:roleId')
  @HttpCode(UserRoleResponse.REVOKE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '사용자 역할 해제',
    description: '사용자에게서 특정 역할을 해제합니다.',
  })
  @SwaggerApiParam({
    name: 'userId',
    type: String,
    description: '사용자 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: UserRoleResponse.REVOKE_SUCCESS.statusCode,
    description: UserRoleResponse.REVOKE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: UserRoleError.USER_ROLE_NOT_FOUND.statusCode,
    description: UserRoleError.USER_ROLE_NOT_FOUND.message,
  })
  @SwaggerApiErrorResponse({
    status: UserRoleError.REVOKE_ERROR.statusCode,
    description: UserRoleError.REVOKE_ERROR.message,
  })
  @RequireRole('superAdmin')
  async revokeUserRole(@Param() params: UserRoleParamsDto): Promise<void> {
    await this.userRoleService.revokeUserRole(params);
  }

  // ==================== 배치 처리 API ====================

  @Post('users/:userId/roles/batch')
  @HttpCode(UserRoleResponse.ASSIGN_MULTIPLE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '사용자에게 여러 역할 할당',
    description: '특정 사용자에게 여러 역할을 한번에 할당합니다.',
  })
  @SwaggerApiParam({
    name: 'userId',
    type: String,
    description: '사용자 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiBody({
    dto: RoleIdsDto,
    description: '할당할 역할 ID 목록',
  })
  @SwaggerApiOkResponse({
    status: UserRoleResponse.ASSIGN_MULTIPLE_SUCCESS.statusCode,
    description: UserRoleResponse.ASSIGN_MULTIPLE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: UserRoleError.ASSIGN_MULTIPLE_ERROR.statusCode,
    description: UserRoleError.ASSIGN_MULTIPLE_ERROR.message,
  })
  @RequireRole('superAdmin')
  @Serialize({
    ...UserRoleResponse.ASSIGN_MULTIPLE_SUCCESS,
  })
  async assignMultipleRoles(
    @Param() params: UserIdParamsDto,
    @Body() dto: RoleIdsDto
  ): Promise<void> {
    await this.userRoleService.assignMultipleRoles({
      userId: params.userId,
      roleIds: dto.roleIds,
    });
  }

  @Delete('users/:userId/roles/batch')
  @HttpCode(UserRoleResponse.REVOKE_MULTIPLE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '사용자에게서 여러 역할 해제',
    description: '특정 사용자에게서 여러 역할을 한번에 해제합니다.',
  })
  @SwaggerApiParam({
    name: 'userId',
    type: String,
    description: '사용자 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiBody({
    dto: RoleIdsDto,
    description: '해제할 역할 ID 목록',
  })
  @SwaggerApiOkResponse({
    status: UserRoleResponse.REVOKE_MULTIPLE_SUCCESS.statusCode,
    description: UserRoleResponse.REVOKE_MULTIPLE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: UserRoleError.REVOKE_MULTIPLE_ERROR.statusCode,
    description: UserRoleError.REVOKE_MULTIPLE_ERROR.message,
  })
  @RequireRole('superAdmin')
  @Serialize({
    ...UserRoleResponse.REVOKE_MULTIPLE_SUCCESS,
  })
  async revokeMultipleRoles(
    @Param() params: UserIdParamsDto,
    @Body() dto: RoleIdsDto
  ): Promise<void> {
    await this.userRoleService.revokeMultipleRoles({
      userId: params.userId,
      roleIds: dto.roleIds,
    });
  }

  @Put('users/:userId/roles')
  @HttpCode(UserRoleResponse.REPLACE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '사용자 역할 완전 교체',
    description: '특정 사용자의 모든 역할을 새로운 역할들로 교체합니다.',
  })
  @SwaggerApiParam({
    name: 'userId',
    type: String,
    description: '사용자 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiBody({
    dto: RoleIdsDto,
    description: '새로운 역할 ID 목록 (기존 역할은 모두 제거됨)',
  })
  @SwaggerApiOkResponse({
    status: UserRoleResponse.REPLACE_SUCCESS.statusCode,
    description: UserRoleResponse.REPLACE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: UserRoleError.REPLACE_ERROR.statusCode,
    description: UserRoleError.REPLACE_ERROR.message,
  })
  @RequireRole('superAdmin')
  @Serialize({
    ...UserRoleResponse.REPLACE_SUCCESS,
  })
  async replaceUserRoles(@Param() params: UserIdParamsDto, @Body() dto: RoleIdsDto): Promise<void> {
    await this.userRoleService.replaceUserRoles({
      userId: params.userId,
      roleIds: dto.roleIds,
    });
  }
}

