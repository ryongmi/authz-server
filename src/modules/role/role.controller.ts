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
  SwaggerApiOkResponse,
  SwaggerApiCreatedResponse,
  SwaggerApiBearerAuth,
} from '@krgeobuk/swagger/decorators';
import { JwtPayload } from '@krgeobuk/jwt/interfaces';
import { CurrentJwt } from '@krgeobuk/jwt/decorators';
import { AccessTokenGuard } from '@krgeobuk/jwt/guards';

import type { PaginatedResult } from '@krgeobuk/core/interfaces';

import { RoleService } from './role.service.js';
import {
  CreateRoleDto,
  UpdateRoleDto,
  RoleSearchQueryDto,
  RoleResponseDto,
} from './dtos/index.js';

@SwaggerApiTags({ tags: ['roles'] })
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

@Get()
  @HttpCode(200)
  @SwaggerApiBearerAuth()
  @SwaggerApiOperation({ summary: '역할 목록 조회' })
  @SwaggerApiOkResponse({
    description: '역할 목록 조회 성공',
    type: RoleResponseDto,
    isArray: true,
  })
  @UseGuards(AccessTokenGuard)
  @Serialize({ dto: RoleResponseDto })
  async searchRoles(
    @Query() query: RoleSearchQueryDto,
  ): Promise<PaginatedResult<RoleResponseDto>> {
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
    @CurrentJwt() jwt: JwtPayload,
  ): Promise<RoleResponseDto> {
    return this.roleService.createRole(createRoleDto);
  }

@Get(':id')
  @HttpCode(200)
  @SwaggerApiBearerAuth()
  @SwaggerApiOperation({ summary: '특정 역할 조회' })
  @SwaggerApiOkResponse({
    description: '역할 조회 성공',
    type: RoleResponseDto,
  })
  @UseGuards(AccessTokenGuard)
  @Serialize({ dto: RoleResponseDto })
  async findRoleById(@Param('id') id: string): Promise<RoleResponseDto> {
    return this.roleService.findById(id);
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
    @CurrentJwt() jwt: JwtPayload,
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
    @CurrentJwt() jwt: JwtPayload,
  ): Promise<{ message: string }> {
    await this.roleService.deleteRole(id);
    return { message: 'Role deleted successfully' };
  }
}
