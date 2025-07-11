import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserRoleEntity } from './entities/user-role.entity.js';
import { UserRoleController } from './user-role.controller.js';
import { UserRoleService } from './user-role.service.js';
import { UserRoleRepository } from './user-role.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserRoleEntity])],
  controllers: [UserRoleController],
  providers: [UserRoleService, UserRoleRepository],
  exports: [UserRoleService],
})
export class UserRoleModule {}
