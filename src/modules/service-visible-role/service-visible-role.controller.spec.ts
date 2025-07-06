import { Test, TestingModule } from '@nestjs/testing';

import { ServiceVisibleRoleController } from './service-visible-role.controller';

describe('ServiceVisibleRoleController', () => {
  let controller: ServiceVisibleRoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceVisibleRoleController],
    }).compile();

    controller = module.get<ServiceVisibleRoleController>(ServiceVisibleRoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
