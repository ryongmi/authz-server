import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { SerializerInterceptor } from '@krgeobuk/core/interceptors';

import { AuthorizationModule } from '@modules/authorization/index.js';
import { PermissionModule } from '@modules/permission/index.js';
import { RoleModule } from '@modules/role/index.js';
import { RolePermissionModule } from '@modules/role-permission/index.js';
import { ServiceVisibleRoleModule } from '@modules/service-visible-role/index.js';
import { UserRoleModule } from '@modules/user-role/index.js';

@Module({
  imports: [
    AuthorizationModule,
    PermissionModule,
    RoleModule,
    RolePermissionModule,
    ServiceVisibleRoleModule,
    UserRoleModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SerializerInterceptor,
    },
  ], // Reflector는 자동 주입됨
})
export class AppModule {}
