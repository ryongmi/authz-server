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

import { ServiceVisibleRoleService } from './service-visible-role.service.js';
import {
  ServiceVisibleRoleSearchQueryDto,
  AssignServiceVisibleRoleDto,
  ServiceVisibleRoleResponseDto,
} from './dtos/index.js';
import { ServiceVisibleRoleEntity } from './entities/service-visible-role.entity.js';

// import { TransactionInterceptor } from '@krgeobuk/core/interceptors';
// import { Serialize, TransactionManager } from '@krgeobuk/core/decorators';

@SwaggerApiTags({ tags: ['service-visible-roles'] })
@SwaggerApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('service-visible-roles')
export class ServiceVisibleRoleController {
  constructor(private readonly svrService: ServiceVisibleRoleService) {}

  @Get()
  @SwaggerApiOperation({
    summary: '서비스-가시역할 관계 목록 조회',
    description: '서비스-가시역할 관계를 검색 조건에 따라 조회합니다.',
  })
  @SwaggerApiPaginatedResponse({
    status: 200,
    description: '서비스-가시역할 관계 목록 조회 성공',
    dto: ServiceVisibleRoleResponseDto,
  })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({ dto: ServiceVisibleRoleResponseDto })
  async getServiceVisibleRoles(
    @Query() query: ServiceVisibleRoleSearchQueryDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<PaginatedResult<ServiceVisibleRoleEntity>> {
    return this.svrService.searchServiceVisibleRoles(query);
  }

  @Get('services/:serviceId')
  @SwaggerApiOperation({
    summary: '서비스의 가시역할 목록 조회',
    description: '특정 서비스에 할당된 가시역할 목록을 조회합니다.',
  })
  @SwaggerApiParam({
    name: 'serviceId',
    type: String,
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: 200,
    description: '서비스 가시역할 목록 조회 성공',
    dto: ServiceVisibleRoleResponseDto,
  })
  @SwaggerApiErrorResponse({ status: 404, description: '서비스를 찾을 수 없음' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({ dto: ServiceVisibleRoleResponseDto })
  async getServiceVisibleRolesByServiceId(
    @Param('serviceId') serviceId: string,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<ServiceVisibleRoleEntity[]> {
    return this.svrService.findByServiceId(serviceId);
  }

  @Get('roles/:roleId')
  @SwaggerApiOperation({
    summary: '역할의 가시서비스 목록 조회',
    description: '특정 역할에 할당된 가시서비스 목록을 조회합니다.',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: 200,
    description: '역할 가시서비스 목록 조회 성공',
    dto: ServiceVisibleRoleResponseDto,
  })
  @SwaggerApiErrorResponse({ status: 404, description: '역할을 찾을 수 없음' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({ dto: ServiceVisibleRoleResponseDto })
  async getServiceVisibleRolesByRoleId(
    @Param('roleId') roleId: string,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<ServiceVisibleRoleEntity[]> {
    return this.svrService.findByRoleId(roleId);
  }

  @Post()
  @SwaggerApiOperation({
    summary: '서비스에 가시역할 할당',
    description: '서비스에 새로운 가시역할을 할당합니다.',
  })
  @SwaggerApiBody({ dto: AssignServiceVisibleRoleDto, description: '서비스 가시역할 할당 데이터' })
  @SwaggerApiOkResponse({
    status: 201,
    description: '가시역할 할당 성공',
    dto: ServiceVisibleRoleResponseDto,
  })
  @SwaggerApiErrorResponse({ status: 400, description: '잘못된 요청 데이터' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  @Serialize({ dto: ServiceVisibleRoleResponseDto })
  async assignServiceVisibleRole(
    @Body() dto: AssignServiceVisibleRoleDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<ServiceVisibleRoleEntity> {
    return this.svrService.assignServiceVisibleRole(dto);
  }

  @Delete('services/:serviceId/roles/:roleId')
  @HttpCode(204)
  @SwaggerApiOperation({
    summary: '서비스 가시역할 제거',
    description: '서비스에서 특정 가시역할을 제거합니다.',
  })
  @SwaggerApiParam({
    name: 'serviceId',
    type: String,
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiParam({
    name: 'roleId',
    type: String,
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({ status: 204, description: '가시역할 제거 성공' })
  @SwaggerApiErrorResponse({ status: 404, description: '서비스 가시역할 관계를 찾을 수 없음' })
  @SwaggerApiErrorResponse({ status: 401, description: '인증 실패' })
  async removeServiceVisibleRole(
    @Param('serviceId') serviceId: string,
    @Param('roleId') roleId: string,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.svrService.removeServiceVisibleRole(serviceId, roleId);
  }
}

