import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserRoleModule } from '@modules/user-role/index.js';

import { RoleEntity } from './entities/role.entity.js';
import { RoleController } from './role.controller.js';
import { RoleTcpController } from './role-tcp.controller.js';
import { RoleService } from './role.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity]), UserRoleModule],
  controllers: [RoleController, RoleTcpController],
  providers: [RoleService],
})
export class RoleModule {}
