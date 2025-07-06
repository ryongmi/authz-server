import { Controller } from '@nestjs/common';
// import { EntityManager } from 'typeorm';
// import { Request } from 'express';
// import { ConfigService } from '@nestjs/config';

import { SwaggerApiTags } from '@krgeobuk/swagger/decorators';
// import type { PaginatedResult } from '@krgeobuk/core/interfaces';

import { RolePermissionService } from './role-permission.service.js';

// import { TransactionInterceptor } from '@krgeobuk/core/interceptors';
// import { Serialize, TransactionManager } from '@krgeobuk/core/decorators';

@SwaggerApiTags({ tags: ['/roles/:roleId/permissions'] })
@Controller('roles/:roleId/permissions')
export class RolePermissionController {
  constructor(private readonly rolePermissionService: RolePermissionService) {}

  // @Get()
  // getPermissionsByRole(@Param('roleId') roleId: string) {
  //   return this.rolePermissionService.getPermissionsByRole(roleId);
  // }

  // @Post()
  // assignPermissionsToRole(
  //   @Param('roleId') roleId: string,
  //   @Body() dto: AssignPermissionsDto,
  // ) {
  //   return this.rolePermissionService.assignPermissions(roleId, dto.permissionIds);
  // }

  // @Delete(':permissionId')
  // removePermissionFromRole(
  //   @Param('roleId') roleId: string,
  //   @Param('permissionId') permissionId: string,
  // ) {
  //   return this.rolePermissionService.removePermission(roleId, permissionId);
  // }
}
