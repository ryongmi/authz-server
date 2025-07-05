import { Test, TestingModule } from '@nestjs/testing';
import { ServiceVisibleRoleService } from './service-visible-role.service';

describe('ServiceVisibleRoleService', () => {
  let service: ServiceVisibleRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceVisibleRoleService],
    }).compile();

    service = module.get<ServiceVisibleRoleService>(ServiceVisibleRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
