import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { WinstonModule } from 'nest-winston';

import { SerializerInterceptor } from '@krgeobuk/core/interceptors';
import { winstonConfig } from '@krgeobuk/core/logger';

import { RedisModule, DatabaseModule } from '@database/index.js';
import { AppConfigModule } from '@config/index.js';
import { SharedClientsModule } from '@common/clients/index.js';
import { AuthorizationGuardModule } from '@common/authorization/index.js';
import { JwtModule } from '@common/jwt/index.js';
import { AuthorizationModule } from '@modules/authorization/index.js';
import { PermissionModule } from '@modules/permission/index.js';
import { RoleModule } from '@modules/role/index.js';
import { RolePermissionModule } from '@modules/role-permission/index.js';
import { ServiceVisibleRoleModule } from '@modules/service-visible-role/index.js';
import { UserRoleModule } from '@modules/user-role/index.js';

@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
    AppConfigModule,
    // TCP 연결 모듈
    SharedClientsModule,
    // authorization guard DI 주입 전용 모듈
    AuthorizationGuardModule,
    // JWT ACCESS TOKEN PUBLIC KEY
    JwtModule,
    DatabaseModule,
    RedisModule,
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
