import { Module } from '@nestjs/common';
import { RoleModule } from '@modules/role/index.js';
import { UserRoleModule } from '@modules/user-role/index.js';
import { ServiceVisibleRoleModule } from '@modules/service-visible-role/index.js';
import { AuthorizationModule } from '@modules/authorization/index.js';

import { SerializerInterceptor } from '@krgeobuk/core/interceptors';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [RoleModule, UserRoleModule, ServiceVisibleRoleModule, AuthorizationModule],

  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SerializerInterceptor,
    },
  ], // Reflector는 자동 주입됨
})
export class AppModule {
}
