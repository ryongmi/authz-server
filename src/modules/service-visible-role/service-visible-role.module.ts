import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ServiceVisibleRoleEntity } from './entities/service-visible-role.entity.js';
import { ServiceVisibleRoleController } from './service-visible-role.controller.js';
import { ServiceVisibleRoleService } from './service-visible-role.service.js';
import { ServiceVisibleRoleRepository } from './service-visible-role.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceVisibleRoleEntity])],
  controllers: [ServiceVisibleRoleController],
  providers: [ServiceVisibleRoleService, ServiceVisibleRoleRepository],
  exports: [ServiceVisibleRoleService],
})
export class ServiceVisibleRoleModule {}
