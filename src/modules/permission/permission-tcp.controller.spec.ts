import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import type {
  PermissionSearchQuery,
  PermissionSearchResult,
  CreatePermission,
} from '@krgeobuk/permission/interfaces';
import type {
  TcpPermissionId,
  TcpMultiService,
  TcpPermissionUpdate,
} from '@krgeobuk/permission/tcp/interfaces';
import { PermissionException } from '@krgeobuk/permission/exception';

import { PermissionTcpController } from './permission-tcp.controller.js';
import { PermissionService } from './permission.service.js';
import { PermissionEntity } from './entities/permission.entity.js';

describe('PermissionTcpController', () => {
  let controller: PermissionTcpController;
  let permissionService: jest.Mocked<PermissionService>;
  let mockLogger: jest.Mocked<Logger>;

  // 테스트 데이터
  const mockPermissionEntity: PermissionEntity = {
    id: 'permission-123',
    action: 'user:create',
    description: 'Create user permission',
    serviceId: 'service-456',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
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

  beforeEach(async () => {
    const mockPermissionService = {
      searchPermissions: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByServiceIds: jest.fn(),
      createPermission: jest.fn(),
      updatePermission: jest.fn(),
      deletePermission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionTcpController],
      providers: [
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
      ],
    }).compile();

    controller = module.get<PermissionTcpController>(PermissionTcpController);
    permissionService = module.get(PermissionService);

    // Logger 모킹 추가
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      verbose: jest.fn(),
      fatal: jest.fn(),
      localInstance: undefined,
    } as unknown as jest.Mocked<Logger>;

    // Controller의 logger를 모킹
    // Logger 프로퍼티 직접 교체
    Object.defineProperty(controller, 'logger', {
      value: mockLogger,
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchPermissions', () => {
    it('TCP 권한 검색 요청을 처리해야 함', async () => {
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
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'TCP permission search request received',
        expect.objectContaining({
          serviceId: 'service-456',
          hasActionFilter: true,
          page: 1,
          limit: 15,
        })
      );
    });

    it('TCP 권한 검색 실패 시 에러를 던져야 함', async () => {
      // Given
      const query: PermissionSearchQuery = { page: 1, limit: 15 };
      const error = PermissionException.permissionFetchError();
      permissionService.searchPermissions.mockRejectedValue(error);

      // When & Then
      await expect(controller.searchPermissions(query)).rejects.toThrow(
        PermissionException.permissionFetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TCP permission search failed',
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });
  });

  describe('findById', () => {
    it('TCP 권한 ID 조회 요청을 처리해야 함', async () => {
      // Given
      const data: TcpPermissionId = { permissionId: 'permission-123' };
      permissionService.findById.mockResolvedValue(mockPermissionEntity);

      // When
      const result = await controller.findPermissionById(data);

      // Then
      expect(result).toEqual(mockPermissionEntity);
      expect(permissionService.findById).toHaveBeenCalledWith('permission-123');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'TCP permission detail request: permission-123'
      );
    });

    it('권한이 존재하지 않으면 null을 반환해야 함', async () => {
      // Given
      const data: TcpPermissionId = { permissionId: 'non-existent' };
      permissionService.findById.mockResolvedValue(null);

      // When
      const result = await controller.findPermissionById(data);

      // Then
      expect(result).toBeNull();
      expect(permissionService.findById).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('findByServiceIds', () => {
    it('TCP 서비스별 권한 조회 요청을 처리해야 함', async () => {
      // Given
      const data: TcpMultiService = { serviceIds: ['service-1', 'service-2'] };
      const mockPermissions = [
        mockPermissionEntity,
        { ...mockPermissionEntity, id: 'permission-456' },
      ];
      permissionService.findByServiceIds.mockResolvedValue(mockPermissions);

      // When
      const result = await controller.findPermissionsByServiceIds(data);

      // Then
      expect(result).toEqual(mockPermissions);
      expect(permissionService.findByServiceIds).toHaveBeenCalledWith(['service-1', 'service-2']);
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP permissions by services request', {
        serviceCount: 2,
      });
    });
  });

  describe('createPermission', () => {
    it('TCP 권한 생성 요청을 처리해야 함', async () => {
      // Given
      const data: CreatePermission = {
        action: 'user:create',
        description: 'Create user permission',
        serviceId: 'service-456',
      };
      permissionService.createPermission.mockResolvedValue(undefined);

      // When
      const result = await controller.createPermission(data);

      // Then
      expect(result).toEqual({ success: true });
      expect(permissionService.createPermission).toHaveBeenCalledWith(data);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'TCP permission creation requested',
        expect.objectContaining({
          action: 'user:create',
          serviceId: 'service-456',
        })
      );
    });

    it('TCP 권한 생성 실패 시 에러를 던져야 함', async () => {
      // Given
      const data: CreatePermission = {
        action: 'user:create',
        description: 'Create user permission',
        serviceId: 'service-456',
      };
      const error = PermissionException.permissionCreateError();
      permissionService.createPermission.mockRejectedValue(error);

      // When & Then
      await expect(controller.createPermission(data)).rejects.toThrow(
        PermissionException.permissionCreateError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TCP permission creation failed',
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });
  });

  describe('updatePermission', () => {
    it('TCP 권한 업데이트 요청을 처리해야 함', async () => {
      // Given
      const data: TcpPermissionUpdate = {
        permissionId: 'permission-123',
        updateData: {
          action: 'user:updated',
          description: 'Updated permission',
        },
      };
      permissionService.updatePermission.mockResolvedValue(undefined);

      // When
      const result = await controller.updatePermission(data);

      // Then
      expect(result).toEqual({ success: true });
      expect(permissionService.updatePermission).toHaveBeenCalledWith(
        'permission-123',
        data.updateData
      );
      expect(mockLogger.log).toHaveBeenCalledWith('TCP permission update requested', {
        permissionId: 'permission-123',
      });
    });

    it('TCP 권한 업데이트 실패 시 에러를 던져야 함', async () => {
      // Given
      const data: TcpPermissionUpdate = {
        permissionId: 'permission-123',
        updateData: { action: 'user:updated' },
      };
      const error = PermissionException.permissionUpdateError();
      permissionService.updatePermission.mockRejectedValue(error);

      // When & Then
      await expect(controller.updatePermission(data)).rejects.toThrow(
        PermissionException.permissionUpdateError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TCP permission update failed',
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });
  });

  describe('deletePermission', () => {
    it('TCP 권한 삭제 요청을 처리해야 함', async () => {
      // Given
      const data: TcpPermissionId = { permissionId: 'permission-123' };
      const mockUpdateResult = { affected: 1, generatedMaps: [], raw: {} };
      permissionService.deletePermission.mockResolvedValue(mockUpdateResult);

      // When
      const result = await controller.deletePermission(data);

      // Then
      expect(result).toEqual({ success: true });
      expect(permissionService.deletePermission).toHaveBeenCalledWith('permission-123');
      expect(mockLogger.log).toHaveBeenCalledWith('TCP permission deletion requested', {
        permissionId: 'permission-123',
      });
    });

    it('TCP 권한 삭제 실패 시 에러를 던져야 함', async () => {
      // Given
      const data: TcpPermissionId = { permissionId: 'permission-123' };
      const error = PermissionException.permissionDeleteError();
      permissionService.deletePermission.mockRejectedValue(error);

      // When & Then
      await expect(controller.deletePermission(data)).rejects.toThrow(
        PermissionException.permissionDeleteError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TCP permission deletion failed',
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });
  });

  it('TCP 컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });
});
