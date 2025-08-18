import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import { UpdateResult } from 'typeorm';

import type { CreatePermission, UpdatePermission } from '@krgeobuk/permission/interfaces';
import { PermissionException } from '@krgeobuk/permission/exception';

import { RolePermissionService } from '@modules/role-permission/index.js';
import { RoleService } from '@modules/role/index.js';

import { PermissionService } from './permission.service.js';
import { PermissionRepository } from './permission.repository.js';
import { PermissionEntity } from './entities/permission.entity.js';

// RolePermissionService 모킹을 위한 타입 정의
interface MockRolePermissionService {
  getRoleIds: jest.Mock;
  getRoleCountsBatch: jest.Mock;
}

// RoleService 모킹을 위한 타입 정의
interface MockRoleService {
  findByIds: jest.Mock;
}

describe('PermissionService', () => {
  let service: PermissionService;
  let permissionRepo: jest.Mocked<PermissionRepository>;
  let rolePermissionService: MockRolePermissionService;
  let roleService: MockRoleService;
  let mockLogger: jest.Mocked<Logger>;

  // 테스트 데이터
  const mockPermission: PermissionEntity = {
    id: 'permission-123',
    action: 'user:create',
    description: 'Create user permission',
    serviceId: 'service-456',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockPermissionRepo = {
      findOneById: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      searchPermissions: jest.fn(),
      saveEntity: jest.fn().mockResolvedValue(mockPermission),
      updateEntity: jest.fn().mockResolvedValue(mockPermission),
      softDelete: jest.fn(),
    };

    const mockRolePermissionService: MockRolePermissionService = {
      getRoleIds: jest.fn(),
      getRoleCountsBatch: jest.fn(),
    };

    const mockRoleService: MockRoleService = {
      findByIds: jest.fn(),
    };

    const mockLoggerInstance = {
      debug: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      verbose: jest.fn(),
      fatal: jest.fn(),
      localInstance: undefined,
    } as unknown as jest.Mocked<Logger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: PermissionRepository,
          useValue: mockPermissionRepo,
        },
        {
          provide: RolePermissionService,
          useValue: mockRolePermissionService,
        },
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
        {
          provide: 'PORTAL_SERVICE',
          useValue: { send: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    permissionRepo = module.get(PermissionRepository);
    rolePermissionService = module.get(RolePermissionService);
    roleService = module.get(RoleService);

    // mockLogger 인스턴스 설정
    mockLogger = mockLoggerInstance;

    // Logger 프로퍼티 직접 교체
    Object.defineProperty(service, 'logger', {
      value: mockLogger,
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('권한 ID로 권한을 조회해야 함', async () => {
      // Given
      permissionRepo.findOneById.mockResolvedValue(mockPermission);

      // When
      const result = await service.findById('permission-123');

      // Then
      expect(result).toEqual(mockPermission);
      expect(permissionRepo.findOneById).toHaveBeenCalledWith('permission-123');
    });

    it('존재하지 않는 권한 ID의 경우 null을 반환해야 함', async () => {
      // Given
      permissionRepo.findOneById.mockResolvedValue(null);

      // When
      const result = await service.findById('non-existent');

      // Then
      expect(result).toBeNull();
      expect(permissionRepo.findOneById).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('findByIdOrFail', () => {
    it('권한이 존재하면 반환해야 함', async () => {
      // Given
      permissionRepo.findOneById.mockResolvedValue(mockPermission);

      // When
      const result = await service.findByIdOrFail('permission-123');

      // Then
      expect(result).toEqual(mockPermission);
    });

    it('권한이 존재하지 않으면 PermissionException을 던져야 함', async () => {
      // Given
      permissionRepo.findOneById.mockResolvedValue(null);

      // When & Then
      await expect(service.findByIdOrFail('non-existent')).rejects.toThrow(
        PermissionException.permissionNotFound()
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Permission not found', {
        permissionId: 'non-existent',
      });
    });
  });

  describe('findByIds', () => {
    it('여러 권한 ID로 권한들을 조회해야 함', async () => {
      // Given
      const permissionIds = ['permission-1', 'permission-2'];
      const mockPermissions = [mockPermission, { ...mockPermission, id: 'permission-2' }];
      permissionRepo.find.mockResolvedValue(mockPermissions);

      // When
      const result = await service.findByIds(permissionIds);

      // Then
      expect(result).toEqual(mockPermissions);
      expect(permissionRepo.find).toHaveBeenCalledWith({
        where: { id: expect.any(Object) }, // In 객체
        order: { action: 'DESC' },
      });
    });

    it('빈 배열을 입력하면 빈 배열을 반환해야 함', async () => {
      // When
      const result = await service.findByIds([]);

      // Then
      expect(result).toEqual([]);
      expect(permissionRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('createPermission', () => {
    const createDto: CreatePermission = {
      action: 'user:update',
      description: 'Update user permission',
      serviceId: 'service-456',
    };

    it('새로운 권한을 성공적으로 생성해야 함', async () => {
      // Given
      const savedPermission: PermissionEntity = { ...mockPermission, ...createDto };
      permissionRepo.findOne.mockResolvedValue(null); // 중복 없음
      permissionRepo.saveEntity.mockResolvedValue(savedPermission);

      // When
      await service.createPermission(createDto);

      // Then
      expect(permissionRepo.findOne).toHaveBeenCalledWith({
        where: { action: 'user:update', serviceId: 'service-456' },
      });
      expect(permissionRepo.saveEntity).toHaveBeenCalledWith(
        expect.objectContaining(createDto),
        undefined
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Permission created successfully',
        expect.any(Object)
      );
    });

    it('중복된 권한이 존재하면 PermissionException을 던져야 함', async () => {
      // Given
      permissionRepo.findOne.mockResolvedValue(mockPermission); // 중복 존재

      // When & Then
      await expect(service.createPermission(createDto)).rejects.toThrow(
        PermissionException.permissionAlreadyExists()
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Permission creation failed: duplicate action in service',
        expect.any(Object)
      );
      expect(permissionRepo.saveEntity).not.toHaveBeenCalled();
    });

    it('데이터베이스 에러 발생 시 PermissionException을 던져야 함', async () => {
      // Given
      permissionRepo.findOne.mockResolvedValue(null);
      permissionRepo.saveEntity.mockRejectedValue(new Error('DB Error'));

      // When & Then
      await expect(service.createPermission(createDto)).rejects.toThrow(
        PermissionException.permissionCreateError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Permission creation failed',
        expect.any(Object)
      );
    });
  });

  describe('updatePermission', () => {
    const updateDto: UpdatePermission = {
      action: 'user:updated',
      description: 'Updated permission',
    };

    it('권한을 성공적으로 업데이트해야 함', async () => {
      // Given
      const mockUpdateResult: UpdateResult = {
        affected: 1,
        generatedMaps: [],
        raw: {},
      };
      permissionRepo.findOneById.mockResolvedValue(mockPermission);
      permissionRepo.findOne.mockResolvedValue(null); // 액션 중복 없음
      permissionRepo.updateEntity.mockResolvedValue(mockUpdateResult);

      // When
      await service.updatePermission('permission-123', updateDto);

      // Then
      expect(permissionRepo.updateEntity).toHaveBeenCalledWith(
        expect.objectContaining({ ...mockPermission, ...updateDto }),
        undefined
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Permission updated successfully',
        expect.any(Object)
      );
    });

    it('존재하지 않는 권한 업데이트 시 PermissionException을 던져야 함', async () => {
      // Given
      permissionRepo.findOneById.mockResolvedValue(null);

      // When & Then
      await expect(service.updatePermission('non-existent', updateDto)).rejects.toThrow(
        PermissionException.permissionNotFound()
      );
      expect(permissionRepo.updateEntity).not.toHaveBeenCalled();
    });
  });

  describe('deletePermission', () => {
    const mockUpdateResult: UpdateResult = {
      affected: 1,
      generatedMaps: [],
      raw: {},
    };

    it('역할이 할당되지 않은 권한을 성공적으로 삭제해야 함', async () => {
      // Given
      permissionRepo.findOneById.mockResolvedValue(mockPermission);
      rolePermissionService.getRoleIds.mockResolvedValue([]); // 할당된 역할 없음
      permissionRepo.softDelete.mockResolvedValue(mockUpdateResult);

      // When
      const result = await service.deletePermission('permission-123');

      // Then
      expect(result).toEqual(mockUpdateResult);
      expect(rolePermissionService.getRoleIds).toHaveBeenCalledWith('permission-123');
      expect(permissionRepo.softDelete).toHaveBeenCalledWith('permission-123');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Permission deleted successfully',
        expect.any(Object)
      );
    });

    it('역할이 할당된 권한 삭제 시 PermissionException을 던져야 함', async () => {
      // Given
      permissionRepo.findOneById.mockResolvedValue(mockPermission);
      rolePermissionService.getRoleIds.mockResolvedValue(['role-789']); // 할당된 역할 있음

      // When & Then
      await expect(service.deletePermission('permission-123')).rejects.toThrow(
        PermissionException.permissionDeleteError()
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Permission deletion failed: permission has assigned roles',
        expect.any(Object)
      );
      expect(permissionRepo.softDelete).not.toHaveBeenCalled();
    });

    it('존재하지 않는 권한 삭제 시 PermissionException을 던져야 함', async () => {
      // Given
      permissionRepo.findOneById.mockResolvedValue(null);

      // When & Then
      await expect(service.deletePermission('non-existent')).rejects.toThrow(
        PermissionException.permissionNotFound()
      );
      expect(rolePermissionService.getRoleIds).not.toHaveBeenCalled();
    });
  });
});
