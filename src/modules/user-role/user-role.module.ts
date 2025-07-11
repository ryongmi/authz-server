import { Module } from '@nestjs/common';

import { UserRoleController } from './user-role.controller.js';
import { UserRoleService } from './user-role.service.js';

@Module({
  controllers: [UserRoleController],
  providers: [UserRoleService],
  exports: [UserRoleService],
})
export class UserRoleModule {}
