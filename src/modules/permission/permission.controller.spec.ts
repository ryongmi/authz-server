import { Test, TestingModule } from '@nestjs/testing';

import { AccessTokenGuard } from '@krgeobuk/jwt/guards';
import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import type {
  PermissionSearchQuery,
  PermissionSearchResult,
  PermissionDetail,
  CreatePermission,
  UpdatePermission,
} from '@krgeobuk/permission/interfaces';
import type { JwtPayload } from '@krgeobuk/jwt/interfaces';

import { PermissionController } from './permission.controller.js';
import { PermissionService } from './permission.service.js';

describe('PermissionController', () => {
  let controller: PermissionController;
  let permissionService: jest.Mocked<PermissionService>;

  // 테스트 데이터
  const mockJwtPayload: JwtPayload = {
    sub: 'user-123',
    tokenData: {
      email: 'admin@test.com',
      roles: ['admin'],
      permissions: ['permission:read', 'permission:write'],
    },
  };

  const mockPermissionSearchResult: PaginatedResult<PermissionSearchResult> = {
    items: [
      {
        id: 'permission-123',
        action: 'user:create',
        description: 'Create user permission',
        roleCount: 2,
        service: { id: 'service-456', name: 'Test Service' },
      },
    ],
    pageInfo: {
      page: 1,
      limit: 15,
      totalPages: 1,
      totalItems: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  const mockPermissionDetail: PermissionDetail = {
    id: 'permission-123',
    action: 'user:create',
    description: 'Create user permission',
    service: { id: 'service-456', name: 'Test Service' },
    roles: [{ id: 'role-789', name: 'Admin' }],
  };

  beforeEach(async () => {
    const mockPermissionService = {
      searchPermissions: jest.fn(),
      createPermission: jest.fn(),
      getPermissionById: jest.fn(),
      updatePermission: jest.fn(),
      deletePermission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionController],
      providers: [
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<PermissionController>(PermissionController);
    permissionService = module.get(PermissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchPermissions', () => {
    it('권한 목록을 검색해야 함', async () => {
      // Given
      const query: PermissionSearchQuery = {
        action: 'user',
        serviceId: 'service-456',
        page: 1,
        limit: 15,
      };
      permissionService.searchPermissions.mockResolvedValue(mockPermissionSearchResult);

      // When
      const result = await controller.searchPermissions(query);

      // Then
      expect(result).toEqual(mockPermissionSearchResult);
      expect(permissionService.searchPermissions).toHaveBeenCalledWith(query);
    });
  });

  describe('createPermission', () => {
    it('새로운 권한을 생성해야 함', async () => {
      // Given
      const createDto: CreatePermission = {
        action: 'user:create',
        description: 'Create user permission',
        serviceId: 'service-456',
      };
      permissionService.createPermission.mockResolvedValue(undefined);

      // When
      await controller.createPermission(createDto);

      // Then
      expect(permissionService.createPermission).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getPermissionById', () => {
    it('권한 상세 정보를 조회해야 함', async () => {
      // Given
      const params = { permissionId: 'permission-123' };
      permissionService.getPermissionById.mockResolvedValue(mockPermissionDetail);

      // When
      const result = await controller.getPermissionById(params);

      // Then
      expect(result).toEqual(mockPermissionDetail);
      expect(permissionService.getPermissionById).toHaveBeenCalledWith('permission-123');
    });
  });

  describe('updatePermission', () => {
    it('권한을 업데이트해야 함', async () => {
      // Given
      const params = { permissionId: 'permission-123' };
      const updateDto: UpdatePermission = {
        action: 'user:updated',
        description: 'Updated permission',
      };
      permissionService.updatePermission.mockResolvedValue(undefined);

      // When
      await controller.updatePermission(params, updateDto);

      // Then
      expect(permissionService.updatePermission).toHaveBeenCalledWith('permission-123', updateDto);
    });
  });

  describe('deletePermission', () => {
    it('권한을 삭제해야 함', async () => {
      // Given
      const params = { permissionId: 'permission-123' };
      const mockUpdateResult = { affected: 1, generatedMaps: [], raw: {} };
      permissionService.deletePermission.mockResolvedValue(mockUpdateResult);

      // When
      await controller.deletePermission(params);

      // Then
      expect(permissionService.deletePermission).toHaveBeenCalledWith('permission-123');
    });
  });

  it('컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });
});

