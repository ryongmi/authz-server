import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
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
  SwaggerApiPaginatedResponse,
  SwaggerApiErrorResponse,
} from '@krgeobuk/swagger/decorators';
import { JwtPayload } from '@krgeobuk/jwt/interfaces';
import { CurrentJwt } from '@krgeobuk/jwt/decorators';
import { AccessTokenGuard } from '@krgeobuk/jwt/guards';

import type { PaginatedResult } from '@krgeobuk/core/interfaces';

import { RolePermissionService } from './role-permission.service.js';
import { 
  RolePermissionSearchQueryDto, 
  AssignRolePermissionDto, 
  RolePermissionResponseDto 
} from './dtos/index.js';
import { RolePermissionEntity } from './entities/role-permission.entity.js';

// import { TransactionInterceptor } from '@krgeobuk/core/interceptors';
// import { Serialize, TransactionManager } from '@krgeobuk/core/decorators';

@SwaggerApiTags({ tags: ['role-permissions'] })
@SwaggerApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('role-permissions')
export class RolePermissionController {
  constructor(private readonly rolePermissionService: RolePermissionService) {}

  @Get()
  @SwaggerApiOperation({
    summary: '역할-권한 관계 목록 조회',
    description: '역할-권한 관계를 검색 조건에 따라 조회합니다.',
  })
  @SwaggerApiPaginatedResponse({
    status: 200,
    description: '역할-권한 관계 목록 조회 성공',
    dto: RolePermissionResponseDto
  })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({ dto: RolePermissionResponseDto })
  async getRolePermissions(
    @Query() query: RolePermissionSearchQueryDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<PaginatedResult<RolePermissionEntity>> {
    return this.rolePermissionService.searchRolePermissions(query);
  }

  @Get('roles/:roleId')
  @SwaggerApiOperation({ summary: '역할의 권한 목록 조회', description: '특정 역할에 할당된 권한 목록을 조회합니다.' })
  @SwaggerApiParam({ name: 'roleId', type: String, description: '역할 ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @SwaggerApiOkResponse({ status: 200, description: '역할 권한 목록 조회 성공', dto: RolePermissionResponseDto })
  @SwaggerApiErrorResponse({ status: 404, description: '역할을 찾을 수 없음' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({ dto: RolePermissionResponseDto })
  async getRolePermissionsByRoleId(
    @Param('roleId') roleId: string,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<RolePermissionEntity[]> {
    return this.rolePermissionService.findByRoleId(roleId);
  }

  @Get('permissions/:permissionId')
  @SwaggerApiOperation({ summary: '권한의 역할 목록 조회', description: '특정 권한에 할당된 역할 목록을 조회합니다.' })
  @SwaggerApiParam({ name: 'permissionId', type: String, description: '권한 ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @SwaggerApiOkResponse({ status: 200, description: '권한 역할 목록 조회 성공', dto: RolePermissionResponseDto })
  @SwaggerApiErrorResponse({ status: 404, description: '권한을 찾을 수 없음' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({ dto: RolePermissionResponseDto })
  async getRolePermissionsByPermissionId(
    @Param('permissionId') permissionId: string,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<RolePermissionEntity[]> {
    return this.rolePermissionService.findByPermissionId(permissionId);
  }

  @Post()
  @SwaggerApiOperation({ summary: '역할에 권한 할당', description: '역할에 새로운 권한을 할당합니다.' })
  @SwaggerApiBody({ dto: AssignRolePermissionDto, description: '역할 권한 할당 데이터' })
  @SwaggerApiOkResponse({ status: 201, description: '권한 할당 성공', dto: RolePermissionResponseDto })
  @SwaggerApiErrorResponse({ status: 400, description: '잘못된 요청 데이터' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({ dto: RolePermissionResponseDto })
  async assignRolePermission(
    @Body() dto: AssignRolePermissionDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<RolePermissionEntity> {
    return this.rolePermissionService.assignRolePermission(dto);
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @HttpCode(204)
  @SwaggerApiOperation({ summary: '역할 권한 제거', description: '역할에서 특정 권한을 제거합니다.' })
  @SwaggerApiParam({ name: 'roleId', type: String, description: '역할 ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @SwaggerApiParam({ name: 'permissionId', type: String, description: '권한 ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @SwaggerApiOkResponse({ status: 204, description: '권한 제거 성공' })
  @SwaggerApiErrorResponse({ status: 404, description: '역할 권한 관계를 찾을 수 없음' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  async removeRolePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.removeRolePermission(roleId, permissionId);
  }
}
