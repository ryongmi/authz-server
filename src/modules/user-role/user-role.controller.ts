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

import { UserRoleService } from './user-role.service.js';
import { 
  UserRoleSearchQueryDto, 
  AssignUserRoleDto, 
  UserRoleResponseDto 
} from './dtos/index.js';
import { UserRoleEntity } from './entities/user-role.entity.js';

// import { TransactionInterceptor } from '@krgeobuk/core/interceptors';
// import { Serialize, TransactionManager } from '@krgeobuk/core/decorators';

@SwaggerApiTags({ tags: ['user-roles'] })
@SwaggerApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('user-roles')
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  @Get()
  @SwaggerApiOperation({
    summary: '사용자-역할 관계 목록 조회',
    description: '사용자-역할 관계를 검색 조건에 따라 조회합니다.',
  })
  @SwaggerApiPaginatedResponse({
    status: 200,
    description: '사용자-역할 관계 목록 조회 성공',
    dto: UserRoleResponseDto
  })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({ dto: UserRoleResponseDto })
  async getUserRoles(
    @Query() query: UserRoleSearchQueryDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<PaginatedResult<UserRoleEntity>> {
    return this.userRoleService.searchUserRoles(query);
  }

  @Get('users/:userId')
  @SwaggerApiOperation({ summary: '사용자의 역할 목록 조회', description: '특정 사용자에게 할당된 역할 목록을 조회합니다.' })
  @SwaggerApiParam({ name: 'userId', type: String, description: '사용자 ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @SwaggerApiOkResponse({ status: 200, description: '사용자 역할 목록 조회 성공', dto: UserRoleResponseDto })
  @SwaggerApiErrorResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({ dto: UserRoleResponseDto })
  async getUserRolesByUserId(
    @Param('userId') userId: string,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<UserRoleEntity[]> {
    return this.userRoleService.findByUserId(userId);
  }

  @Get('roles/:roleId')
  @SwaggerApiOperation({ summary: '역할의 사용자 목록 조회', description: '특정 역할에 할당된 사용자 목록을 조회합니다.' })
  @SwaggerApiParam({ name: 'roleId', type: String, description: '역할 ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @SwaggerApiOkResponse({ status: 200, description: '역할 사용자 목록 조회 성공', dto: UserRoleResponseDto })
  @SwaggerApiErrorResponse({ status: 404, description: '역할을 찾을 수 없음' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({ dto: UserRoleResponseDto })
  async getUserRolesByRoleId(
    @Param('roleId') roleId: string,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<UserRoleEntity[]> {
    return this.userRoleService.findByRoleId(roleId);
  }

  @Post()
  @SwaggerApiOperation({ summary: '사용자에게 역할 할당', description: '사용자에게 새로운 역할을 할당합니다.' })
  @SwaggerApiBody({ dto: AssignUserRoleDto, description: '사용자 역할 할당 데이터' })
  @SwaggerApiOkResponse({ status: 201, description: '역할 할당 성공', dto: UserRoleResponseDto })
  @SwaggerApiErrorResponse({ status: 400, description: '잘못된 요청 데이터' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({ dto: UserRoleResponseDto })
  async assignUserRole(
    @Body() dto: AssignUserRoleDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<UserRoleEntity> {
    return this.userRoleService.assignUserRole(dto);
  }

  @Delete('users/:userId/roles/:roleId')
  @HttpCode(204)
  @SwaggerApiOperation({ summary: '사용자 역할 제거', description: '사용자에게서 특정 역할을 제거합니다.' })
  @SwaggerApiParam({ name: 'userId', type: String, description: '사용자 ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @SwaggerApiParam({ name: 'roleId', type: String, description: '역할 ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @SwaggerApiOkResponse({ status: 204, description: '역할 제거 성공' })
  @SwaggerApiErrorResponse({ status: 404, description: '사용자 역할 관계를 찾을 수 없음' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  async removeUserRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.userRoleService.removeUserRole(userId, roleId);
  }
}
