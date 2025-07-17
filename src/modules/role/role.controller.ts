import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
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
import { AccessTokenGuard } from '@krgeobuk/jwt/guards';
import { AuthorizationGuard } from '@krgeobuk/authorization/guards';
import { RequireRole } from '@krgeobuk/authorization/decorators';
import { RoleResponse } from '@krgeobuk/role/response';
import { RoleError } from '@krgeobuk/role/exception';
import { RoleIdParamsDto } from '@krgeobuk/shared/role/dtos';
import {
  RoleSearchQueryDto,
  RoleDetailDto,
  RoleSearchResultDto,
  CreateRoleDto,
  UpdateRoleDto,
  RolePaginatedSearchResultDto,
} from '@krgeobuk/role/dtos';

import { RoleService } from './role.service.js';

@SwaggerApiTags({ tags: ['roles'] })
@SwaggerApiBearerAuth()
@UseGuards(AccessTokenGuard, AuthorizationGuard)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @HttpCode(RoleResponse.FETCH_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '역할 목록 조회',
    description: '역할 목록을 검색 조건에 따라 조회합니다.',
  })
  @SwaggerApiPaginatedResponse({
    status: RoleResponse.FETCH_SUCCESS.statusCode,
    description: RoleResponse.FETCH_SUCCESS.message,
    dto: RoleSearchResultDto,
  })
  @SwaggerApiErrorResponse({
    status: RoleError.ROLE_FETCH_ERROR.statusCode,
    description: RoleError.ROLE_FETCH_ERROR.message,
  })
  @RequireRole('superAdmin')
  @Serialize({
    dto: RolePaginatedSearchResultDto,
    ...RoleResponse.FETCH_SUCCESS,
  })
  async searchRoles(@Query() query: RoleSearchQueryDto): Promise<RolePaginatedSearchResultDto> {
    return await this.roleService.searchRoles(query);
  }

  @Post()
  @HttpCode(RoleResponse.CREATE_SUCCESS.statusCode)
  @SwaggerApiOperation({ summary: '역할 생성', description: '새로운 역할을 생성합니다.' })
  @SwaggerApiBody({ dto: CreateRoleDto, description: '역할 생성 데이터' })
  @SwaggerApiOkResponse({
    status: RoleResponse.CREATE_SUCCESS.statusCode,
    description: RoleResponse.CREATE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: RoleError.ROLE_CREATE_ERROR.statusCode,
    description: RoleError.ROLE_CREATE_ERROR.message,
  })
  @SwaggerApiErrorResponse({
    status: RoleError.ROLE_ALREADY_EXISTS.statusCode,
    description: RoleError.ROLE_ALREADY_EXISTS.message,
  })
  @RequireRole('superAdmin')
  @Serialize({
    ...RoleResponse.CREATE_SUCCESS,
  })
  async createRole(@Body() createRoleDto: CreateRoleDto): Promise<void> {
    await this.roleService.createRole(createRoleDto);
  }

  @Get(':roleId')
  @HttpCode(RoleResponse.FETCH_SUCCESS.statusCode)
  @SwaggerApiOperation({ summary: '역할 상세 조회', description: 'ID로 특정 역할을 조회합니다.' })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: RoleResponse.FETCH_SUCCESS.statusCode,
    description: RoleResponse.FETCH_SUCCESS.message,
    dto: RoleDetailDto,
  })
  @SwaggerApiErrorResponse({
    status: RoleError.ROLE_NOT_FOUND.statusCode,
    description: RoleError.ROLE_NOT_FOUND.message,
  })
  @SwaggerApiErrorResponse({
    status: RoleError.ROLE_FETCH_ERROR.statusCode,
    description: RoleError.ROLE_FETCH_ERROR.message,
  })
  @RequireRole('superAdmin')
  @Serialize({
    dto: RoleDetailDto,
    ...RoleResponse.FETCH_SUCCESS,
  })
  async getRoleById(@Param() params: RoleIdParamsDto): Promise<RoleDetailDto> {
    return await this.roleService.getRoleById(params.roleId);
  }

  @Patch(':roleId')
  @HttpCode(RoleResponse.UPDATE_SUCCESS.statusCode)
  @SwaggerApiOperation({ summary: '역할 수정', description: '기존 역할을 수정합니다.' })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiBody({ dto: UpdateRoleDto, description: '역할 수정 데이터' })
  @SwaggerApiOkResponse({
    status: RoleResponse.UPDATE_SUCCESS.statusCode,
    description: RoleResponse.UPDATE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: RoleError.ROLE_NOT_FOUND.statusCode,
    description: RoleError.ROLE_NOT_FOUND.message,
  })
  @SwaggerApiErrorResponse({
    status: RoleError.ROLE_UPDATE_ERROR.statusCode,
    description: RoleError.ROLE_UPDATE_ERROR.message,
  })
  @RequireRole('superAdmin')
  @Serialize({
    ...RoleResponse.UPDATE_SUCCESS,
  })
  async updateRole(
    @Param() params: RoleIdParamsDto,
    @Body() updateRoleDto: UpdateRoleDto
  ): Promise<void> {
    await this.roleService.updateRole(params.roleId, updateRoleDto);
  }

  @Delete(':roleId')
  @HttpCode(RoleResponse.DELETE_SUCCESS.statusCode)
  @SwaggerApiOperation({ summary: '역할 삭제', description: '역할을 소프트 삭제합니다.' })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: RoleResponse.DELETE_SUCCESS.statusCode,
    description: RoleResponse.DELETE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: RoleError.ROLE_NOT_FOUND.statusCode,
    description: RoleError.ROLE_NOT_FOUND.message,
  })
  @SwaggerApiErrorResponse({
    status: RoleError.ROLE_DELETE_ERROR.statusCode,
    description: RoleError.ROLE_DELETE_ERROR.message,
  })
  @RequireRole('superAdmin')
  @Serialize({
    ...RoleResponse.DELETE_SUCCESS,
  })
  async deleteRole(@Param() params: RoleIdParamsDto): Promise<void> {
    await this.roleService.deleteRole(params.roleId);
  }
}
