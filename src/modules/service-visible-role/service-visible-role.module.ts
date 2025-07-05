import { Module } from '@nestjs/common';
import { ServiceVisibleRoleController } from './service-visible-role.controller';
import { ServiceVisibleRoleService } from './service-visible-role.service';

@Module({
  controllers: [ServiceVisibleRoleController],
  providers: [ServiceVisibleRoleService]
})
export class ServiceVisibleRoleModule {}
