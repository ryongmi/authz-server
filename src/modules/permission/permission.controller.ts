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
import { PermissionResponse } from '@krgeobuk/permission/response';
import { PermissionError } from '@krgeobuk/permission/exception';
import { PermissionIdParamsDto } from '@krgeobuk/shared/permission/dtos';
import {
  PermissionSearchQueryDto,
  PermissionDetailDto,
  PermissionSearchResultDto,
  PermissionPaginatedSearchResultDto,
  CreatePermissionDto,
  UpdatePermissionDto,
} from '@krgeobuk/permission/dtos';

import { PermissionService } from './permission.service.js';

@SwaggerApiTags({ tags: ['permissions'] })
@SwaggerApiBearerAuth()
@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @HttpCode(PermissionResponse.FETCH_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '권한 목록 조회',
    description: '권한 목록을 검색 조건에 따라 조회합니다.',
  })
  @SwaggerApiPaginatedResponse({
    status: PermissionResponse.FETCH_SUCCESS.statusCode,
    description: PermissionResponse.FETCH_SUCCESS.message,
    dto: PermissionSearchResultDto,
  })
  @SwaggerApiErrorResponse({
    status: PermissionError.PERMISSION_FETCH_ERROR.statusCode,
    description: PermissionError.PERMISSION_FETCH_ERROR.message,
  })
  @UseGuards(AccessTokenGuard)
  @Serialize({
    dto: PermissionPaginatedSearchResultDto,
    ...PermissionResponse.FETCH_SUCCESS,
  })
  async searchPermissions(
    @Query() query: PermissionSearchQueryDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<PermissionPaginatedSearchResultDto> {
    return await this.permissionService.searchPermissions(query);
  }

  @Get(':permissionId')
  @HttpCode(PermissionResponse.FETCH_SUCCESS.statusCode)
  @SwaggerApiOperation({ summary: '권한 상세 조회', description: 'ID로 특정 권한을 조회합니다.' })
  @SwaggerApiParam({
    name: 'permissionId',
    type: String,
    description: '권한 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: PermissionResponse.FETCH_SUCCESS.statusCode,
    description: PermissionResponse.FETCH_SUCCESS.message,
    dto: PermissionDetailDto,
  })
  @SwaggerApiErrorResponse({
    status: PermissionError.PERMISSION_NOT_FOUND.statusCode,
    description: PermissionError.PERMISSION_NOT_FOUND.message,
  })
  @SwaggerApiErrorResponse({
    status: PermissionError.PERMISSION_FETCH_ERROR.statusCode,
    description: PermissionError.PERMISSION_FETCH_ERROR.message,
  })
  @UseGuards(AccessTokenGuard)
  @Serialize({
    dto: PermissionDetailDto,
    ...PermissionResponse.FETCH_SUCCESS,
  })
  async getPermissionById(
    @Param() params: PermissionIdParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<PermissionDetailDto> {
    return await this.permissionService.getPermissionById(params.permissionId);
  }

  @Post()
  @HttpCode(PermissionResponse.CREATE_SUCCESS.statusCode)
  @SwaggerApiOperation({ summary: '권한 생성', description: '새로운 권한을 생성합니다.' })
  @SwaggerApiBody({ dto: CreatePermissionDto, description: '권한 생성 데이터' })
  @SwaggerApiOkResponse({
    status: PermissionResponse.CREATE_SUCCESS.statusCode,
    description: PermissionResponse.CREATE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: PermissionError.PERMISSION_CREATE_ERROR.statusCode,
    description: PermissionError.PERMISSION_CREATE_ERROR.message,
  })
  @SwaggerApiErrorResponse({
    status: PermissionError.PERMISSION_ALREADY_EXISTS.statusCode,
    description: PermissionError.PERMISSION_ALREADY_EXISTS.message,
  })
  @UseGuards(AccessTokenGuard)
  @Serialize({
    ...PermissionResponse.CREATE_SUCCESS,
  })
  async createPermission(
    @Body() dto: CreatePermissionDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.permissionService.createPermission(dto);
  }

  @Patch(':permissionId')
  @HttpCode(PermissionResponse.UPDATE_SUCCESS.statusCode)
  @SwaggerApiOperation({ summary: '권한 수정', description: '기존 권한을 수정합니다.' })
  @SwaggerApiParam({
    name: 'permissionId',
    type: String,
    description: '권한 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiBody({ dto: UpdatePermissionDto, description: '권한 수정 데이터' })
  @SwaggerApiOkResponse({
    status: PermissionResponse.UPDATE_SUCCESS.statusCode,
    description: PermissionResponse.UPDATE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: PermissionError.PERMISSION_NOT_FOUND.statusCode,
    description: PermissionError.PERMISSION_NOT_FOUND.message,
  })
  @SwaggerApiErrorResponse({
    status: PermissionError.PERMISSION_UPDATE_ERROR.statusCode,
    description: PermissionError.PERMISSION_UPDATE_ERROR.message,
  })
  @UseGuards(AccessTokenGuard)
  @Serialize({
    ...PermissionResponse.UPDATE_SUCCESS,
  })
  async updatePermission(
    @Param() params: PermissionIdParamsDto,
    @Body() dto: UpdatePermissionDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.permissionService.updatePermission(params.permissionId, dto);
  }

  @Delete(':permissionId')
  @HttpCode(PermissionResponse.DELETE_SUCCESS.statusCode)
  @SwaggerApiOperation({ summary: '권한 삭제', description: '권한을 소프트 삭제합니다.' })
  @SwaggerApiParam({
    name: 'permissionId',
    type: String,
    description: '권한 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: PermissionResponse.DELETE_SUCCESS.statusCode,
    description: PermissionResponse.DELETE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: PermissionError.PERMISSION_NOT_FOUND.statusCode,
    description: PermissionError.PERMISSION_NOT_FOUND.message,
  })
  @SwaggerApiErrorResponse({
    status: PermissionError.PERMISSION_DELETE_ERROR.statusCode,
    description: PermissionError.PERMISSION_DELETE_ERROR.message,
  })
  @UseGuards(AccessTokenGuard)
  @Serialize({
    ...PermissionResponse.DELETE_SUCCESS,
  })
  async deletePermission(
    @Param() params: PermissionIdParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.permissionService.deletePermission(params.permissionId);
  }
}
