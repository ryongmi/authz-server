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
import { JwtPayload } from '@krgeobuk/jwt/interfaces';
import { CurrentJwt } from '@krgeobuk/jwt/decorators';
import { AccessTokenGuard } from '@krgeobuk/jwt/guards';
import { RoleResponse } from '@krgeobuk/role/response';
import { RoleError } from '@krgeobuk/role/exception';
import {
  RoleSearchQueryDto,
  RoleDetailDto,
  RoleSearchResultDto,
} from '@krgeobuk/role/dtos';
import type { PaginatedResult } from '@krgeobuk/core/interfaces';

import { RoleService } from './role.service.js';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from './dtos/index.js';

@SwaggerApiTags({ tags: ['roles'] })
@SwaggerApiBearerAuth()
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
  @UseGuards(AccessTokenGuard)
  @Serialize({
    dto: RoleSearchResultDto,
    ...RoleResponse.FETCH_SUCCESS,
  })
  async searchRoles(@Query() query: RoleSearchQueryDto): Promise<PaginatedResult<RoleResponseDto>> {
    return this.roleService.searchRoles(query);
  }

  @Post()
  @HttpCode(201)
  @SwaggerApiBearerAuth()
  @SwaggerApiOperation({ summary: '역할 생성' })
  @SwaggerApiCreatedResponse({
    description: '역할 생성 성공',
    type: RoleResponseDto,
  })
  @UseGuards(AccessTokenGuard)
  @Serialize({ dto: RoleResponseDto })
  async createRole(
    @Body() createRoleDto: CreateRoleDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<RoleResponseDto> {
    return this.roleService.createRole(createRoleDto);
  }

  @Get(':id')
  @HttpCode(RoleResponse.FETCH_SUCCESS.statusCode)
  @SwaggerApiOperation({ summary: '역할 상세 조회', description: 'ID로 특정 역할을 조회합니다.' })
  @SwaggerApiParam({
    name: 'id',
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
  @UseGuards(AccessTokenGuard)
  @Serialize({
    dto: RoleDetailDto,
    ...RoleResponse.FETCH_SUCCESS,
  })
  async findRoleById(@Param('id') id: string): Promise<RoleResponseDto> {
    return this.roleService.findByIdOrFail(id);
  }

  @Patch(':id')
  @HttpCode(200)
  @SwaggerApiBearerAuth()
  @SwaggerApiOperation({ summary: '역할 수정' })
  @SwaggerApiOkResponse({
    description: '역할 수정 성공',
    type: RoleResponseDto,
  })
  @UseGuards(AccessTokenGuard)
  @Serialize({ dto: RoleResponseDto })
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<RoleResponseDto> {
    const existingRole = await this.roleService.findById(id);
    if (!existingRole) {
      throw new Error('Role not found');
    }

    Object.assign(existingRole, updateRoleDto);
    await this.roleService.updateRole(existingRole);

    return this.roleService.findById(id);
  }

  @Delete(':id')
  @HttpCode(200)
  @SwaggerApiBearerAuth()
  @SwaggerApiOperation({ summary: '역할 삭제' })
  @SwaggerApiOkResponse({ description: '역할 삭제 성공' })
  @UseGuards(AccessTokenGuard)
  async deleteRole(
    @Param('id') id: string,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<{ message: string }> {
    await this.roleService.deleteRole(id);
    return { message: 'Role deleted successfully' };
  }
}

