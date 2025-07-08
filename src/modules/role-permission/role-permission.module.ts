import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolePermissionEntity } from './entities/role-permission.entity.js';
import { RolePermissionController } from './role-permission.controller.js';
import { RolePermissionRepository } from './role-permission.repository.js';
import { RolePermissionService } from './role-permission.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([RolePermissionEntity])],
  controllers: [RolePermissionController],
  providers: [RolePermissionService, RolePermissionRepository],
  exports: [RolePermissionService],
})
export class RolePermissionModule {}

