import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
// import { Request, Response } from 'express';

import { Serialize } from '@krgeobuk/core/decorators';

// import {
//   SearchQueryDto,
//   ChangePasswordDto,
//   UpdateMyProfileDto,
//   SearchResultDto,
//   DetailDto,
// } from '@krgeobuk/role/dtos';
// import { AuthError } from '@krgeobuk/role/exception';
// import { AuthResponse } from '@krgeobuk/role/response';
import {
  SwaggerApiTags,
  // SwaggerApiBody,
  // SwaggerApiOperation,
  // SwaggerApiOkResponse,
  // SwaggerApiErrorResponse,
} from '@krgeobuk/swagger/decorators';
import { JwtPayload } from '@krgeobuk/jwt/interfaces';
import { CurrentJwt } from '@krgeobuk/jwt/decorators';
import { AccessTokenGuard } from '@krgeobuk/jwt/guards';

import type { PaginatedResult } from '@krgeobuk/core/interfaces';
// import type { PaginatedResult } from '@krgeobuk/core/interfaces';

import { PermissionService } from './permission.service.js';

// import { TransactionInterceptor } from '@krgeobuk/core/interceptors';
// import { Serialize, TransactionManager } from '@krgeobuk/core/decorators';

@SwaggerApiTags({ tags: ['permissions'] })
@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  // @Get()
  // getAll(@Query('serviceId') serviceId?: string) {
  //   return this.permissionService.getAll(serviceId);
  // }

  // @Get(':id')
  // getOne(@Param('id') id: string) {
  //   return this.permissionService.getOne(id);
  // }

  // @Post()
  // create(@Body() dto: CreatePermissionDto) {
  //   return this.permissionService.create(dto);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() dto: UpdatePermissionDto) {
  //   return this.permissionService.update(id, dto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.permissionService.remove(id);
  // }
}
