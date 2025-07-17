import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolePermissionModule } from '@modules/role-permission/index.js';
import { RoleModule } from '@modules/role/index.js';

import { PermissionEntity } from './entities/permission.entity.js';
import { PermissionController } from './permission.controller.js';
import { PermissionTcpController } from './permission-tcp.controller.js';
import { PermissionRepository } from './permission.repository.js';
import { PermissionService } from './permission.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PermissionEntity]), RolePermissionModule, RoleModule],
  controllers: [PermissionController, PermissionTcpController],
  providers: [PermissionService, PermissionRepository],
  exports: [PermissionService],
})
export class PermissionModule {}
