import { Module } from '@nestjs/common';

import { RoleModule } from '@modules/role/index.js';
import { PermissionModule } from '@modules/permission/index.js';
import { UserRoleModule } from '@modules/user-role/index.js';
import { RolePermissionModule } from '@modules/role-permission/index.js';
import { ServiceVisibleRoleModule } from '@modules/service-visible-role/index.js';

import { AuthorizationController } from './authorization.controller.js';
import { AuthorizationService } from './authorization.service.js';
import { AuthorizationTcpController } from './authorization-tcp.controller.js';

@Module({
  imports: [
    RoleModule,
    PermissionModule,
    UserRoleModule,
    RolePermissionModule,
    ServiceVisibleRoleModule,
  ],
  controllers: [AuthorizationController, AuthorizationTcpController],
  providers: [AuthorizationService],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
