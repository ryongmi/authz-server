import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import { TcpSearchResponse } from '@krgeobuk/core/interfaces';
import type { RoleSearchQuery, RoleSearchResult, CreateRole } from '@krgeobuk/role/interfaces';
import { TcpRoleId, TcpMultiServiceIds, TcpRoleUpdate } from '@krgeobuk/role/tcp/interfaces';
import { RoleException } from '@krgeobuk/role/exception';

import { RoleTcpController } from './role-tcp.controller.js';
import { RoleService } from './role.service.js';
import { RoleEntity } from './entities/role.entity.js';

describe('RoleTcpController', () => {
  let controller: RoleTcpController;
  let roleService: jest.Mocked<RoleService>;
  let mockLogger: jest.Mocked<Logger>;

  // 테스트 데이터
  const mockRole: RoleEntity = {
    id: 'role-123',
    name: 'Admin',
    description: 'Administrator role',
    priority: 1,
    serviceId: 'service-456',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as RoleEntity;

  const mockRoleSearchResult: RoleSearchResult = {
    id: 'role-123',
    name: 'Admin',
    description: 'Administrator role',
    priority: 1,
    userCount: 5,
    service: {
      id: 'service-456',
      name: 'Test Service',
    },
  };

  const mockSearchResponse: TcpSearchResponse<RoleSearchResult> = {
    items: [mockRoleSearchResult],
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
    const mockRoleService = {
      searchRoles: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      createRole: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
      findByServiceIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleTcpController],
      providers: [
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
      ],
    }).compile();

    controller = module.get<RoleTcpController>(RoleTcpController);
    roleService = module.get(RoleService);

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

  describe('searchRoles', () => {
    const mockQuery: RoleSearchQuery = {
      name: 'Admin',
      serviceId: 'service-456',
      page: 1,
      limit: 15,
    };

    it('역할 검색을 성공적으로 수행해야 함', async () => {
      // Given
      roleService.searchRoles.mockResolvedValue(mockSearchResponse);

      // When
      const result = await controller.searchRoles(mockQuery);

      // Then
      expect(result).toEqual(mockSearchResponse);
      expect(roleService.searchRoles).toHaveBeenCalledWith(mockQuery);
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP role search request', {
        hasNameFilter: true,
        serviceId: 'service-456',
      });
      expect(mockLogger.log).toHaveBeenCalledWith('TCP role search completed', {
        resultCount: 1,
        totalItems: 1,
      });
    });

    it('서비스에서 에러 발생 시 에러를 전파하고 로깅해야 함', async () => {
      // Given
      const error = RoleException.roleFetchError();
      roleService.searchRoles.mockRejectedValue(error);

      // When & Then
      await expect(controller.searchRoles(mockQuery)).rejects.toThrow(
        RoleException.roleFetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP role search failed', {
        error: expect.any(String),
        serviceId: 'service-456',
      });
    });

    it('이름 필터가 없는 경우 hasNameFilter를 false로 로깅해야 함', async () => {
      // Given
      const { name, ...queryWithoutName } = mockQuery;
      roleService.searchRoles.mockResolvedValue(mockSearchResponse);

      // When
      await controller.searchRoles(queryWithoutName);

      // Then
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP role search request', {
        hasNameFilter: false,
        serviceId: 'service-456',
      });
    });
  });

  describe('findRoleById', () => {
    const mockData: TcpRoleId = { roleId: 'role-123' };

    it('역할 ID로 역할을 성공적으로 조회해야 함', async () => {
      // Given
      roleService.findById.mockResolvedValue(mockRole);

      // When
      const result = await controller.findRoleById(mockData);

      // Then
      expect(result).toEqual(mockRole);
      expect(roleService.findById).toHaveBeenCalledWith('role-123');
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP role detail request: role-123');
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP role findById response: Admin');
    });

    it('역할이 존재하지 않는 경우 null을 반환해야 함', async () => {
      // Given
      roleService.findById.mockResolvedValue(null);

      // When
      const result = await controller.findRoleById(mockData);

      // Then
      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP role findById response: not found');
    });

    it('서비스에서 에러 발생 시 에러를 전파하고 로깅해야 함', async () => {
      // Given
      const error = RoleException.roleFetchError();
      roleService.findById.mockRejectedValue(error);

      // When & Then
      await expect(controller.findRoleById(mockData)).rejects.toThrow(
        RoleException.roleFetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP role detail failed', {
        error: expect.any(String),
        roleId: 'role-123',
      });
    });
  });

  describe('findRolesByIds', () => {
    const mockData = { roleIds: ['role-1', 'role-2'] };

    it('여러 역할 ID로 역할들을 성공적으로 조회해야 함', async () => {
      // Given
      const mockRoles = [mockRole, { ...mockRole, id: 'role-2' }];
      roleService.findByIds.mockResolvedValue(mockRoles);

      // When
      const result = await controller.findRolesByIds(mockData);

      // Then
      expect(result).toEqual(mockRoles);
      expect(roleService.findByIds).toHaveBeenCalledWith(['role-1', 'role-2']);
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP role findByIds request: 2');
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP role findByIds response: 2');
    });

    it('역할을 찾지 못한 경우 빈 배열 로깅해야 함', async () => {
      // Given
      roleService.findByIds.mockResolvedValue([]);

      // When
      await controller.findRolesByIds(mockData);

      // Then
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP role findByIds response: not found');
    });

    it('서비스에서 에러 발생 시 에러를 전파하고 로깅해야 함', async () => {
      // Given
      const error = RoleException.roleFetchError();
      roleService.findByIds.mockRejectedValue(error);

      // When & Then
      await expect(controller.findRolesByIds(mockData)).rejects.toThrow(
        RoleException.roleFetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP role findByIds failed', {
        error: expect.any(String),
        roleCount: 2,
      });
    });
  });

  describe('createRole', () => {
    const mockCreateData: CreateRole = {
      name: 'New Role',
      description: 'New role description',
      priority: 2,
      serviceId: 'service-456',
    };

    it('새로운 역할을 성공적으로 생성해야 함', async () => {
      // Given
      roleService.createRole.mockResolvedValue(undefined);

      // When
      const result = await controller.createRole(mockCreateData);

      // Then
      expect(result).toEqual({ success: true });
      expect(roleService.createRole).toHaveBeenCalledWith(mockCreateData);
      expect(mockLogger.log).toHaveBeenCalledWith('TCP role creation requested', {
        name: 'New Role',
        serviceId: 'service-456',
      });
      expect(mockLogger.log).toHaveBeenCalledWith('TCP role creation completed', {
        name: 'New Role',
        serviceId: 'service-456',
      });
    });

    it('서비스에서 에러 발생 시 에러를 전파하고 로깅해야 함', async () => {
      // Given
      const error = RoleException.roleAlreadyExists();
      roleService.createRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.createRole(mockCreateData)).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith('TCP role creation failed', {
        error: expect.any(String),
        roleName: 'New Role',
        serviceId: 'service-456',
      });
    });
  });

  describe('updateRole', () => {
    const mockUpdateData: TcpRoleUpdate = {
      roleId: 'role-123',
      updateData: {
        name: 'Updated Role',
        description: 'Updated description',
      },
    };

    it('역할을 성공적으로 업데이트해야 함', async () => {
      // Given
      roleService.updateRole.mockResolvedValue(undefined);

      // When
      const result = await controller.updateRole(mockUpdateData);

      // Then
      expect(result).toEqual({ success: true });
      expect(roleService.updateRole).toHaveBeenCalledWith('role-123', mockUpdateData.updateData);
      expect(mockLogger.log).toHaveBeenCalledWith('TCP role update requested', {
        roleId: 'role-123',
      });
      expect(mockLogger.log).toHaveBeenCalledWith('TCP role update completed', {
        roleId: 'role-123',
      });
    });

    it('서비스에서 에러 발생 시 에러를 전파하고 로깅해야 함', async () => {
      // Given
      const error = RoleException.roleNotFound();
      roleService.updateRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.updateRole(mockUpdateData)).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith('TCP role update failed', {
        error: expect.any(String),
        roleId: 'role-123',
      });
    });
  });

  describe('deleteRole', () => {
    const mockData: TcpRoleId = { roleId: 'role-123' };

    it('역할을 성공적으로 삭제해야 함', async () => {
      // Given
      roleService.deleteRole.mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: {},
      });

      // When
      const result = await controller.deleteRole(mockData);

      // Then
      expect(result).toEqual({ success: true });
      expect(roleService.deleteRole).toHaveBeenCalledWith('role-123');
      expect(mockLogger.log).toHaveBeenCalledWith('TCP role deletion requested', {
        roleId: 'role-123',
      });
      expect(mockLogger.log).toHaveBeenCalledWith('TCP role deletion completed', {
        roleId: 'role-123',
      });
    });

    it('서비스에서 에러 발생 시 에러를 전파하고 로깅해야 함', async () => {
      // Given
      const error = RoleException.roleDeleteError();
      roleService.deleteRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.deleteRole(mockData)).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith('TCP role deletion failed', {
        error: expect.any(String),
        roleId: 'role-123',
      });
    });
  });

  describe('findRolesByServiceIds', () => {
    const mockData: TcpMultiServiceIds = {
      serviceIds: ['service-1', 'service-2'],
    };

    it('서비스 ID들로 역할들을 성공적으로 조회해야 함', async () => {
      // Given
      const mockRoles = [mockRole, { ...mockRole, id: 'role-2' }];
      roleService.findByServiceIds.mockResolvedValue(mockRoles);

      // When
      const result = await controller.findRolesByServiceIds(mockData);

      // Then
      expect(result).toEqual(mockRoles);
      expect(roleService.findByServiceIds).toHaveBeenCalledWith(['service-1', 'service-2']);
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP roles by services request', {
        serviceCount: 2,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP found 2 roles for 2 services');
    });

    it('서비스에서 에러 발생 시 에러를 전파하고 로깅해야 함', async () => {
      // Given
      const error = RoleException.roleFetchError();
      roleService.findByServiceIds.mockRejectedValue(error);

      // When & Then
      await expect(controller.findRolesByServiceIds(mockData)).rejects.toThrow(
        RoleException.roleFetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP roles by services failed', {
        error: expect.any(String),
        serviceCount: 2,
      });
    });
  });

  describe('existsRole', () => {
    const mockData: TcpRoleId = { roleId: 'role-123' };

    it('역할이 존재하는 경우 true를 반환해야 함', async () => {
      // Given
      roleService.findById.mockResolvedValue(mockRole);

      // When
      const result = await controller.existsRole(mockData);

      // Then
      expect(result).toBe(true);
      expect(roleService.findById).toHaveBeenCalledWith('role-123');
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP role existence check: role-123');
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP role exists: true');
    });

    it('역할이 존재하지 않는 경우 false를 반환해야 함', async () => {
      // Given
      roleService.findById.mockResolvedValue(null);

      // When
      const result = await controller.existsRole(mockData);

      // Then
      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP role exists: false');
    });

    it('서비스에서 에러 발생 시 false를 반환하고 로깅해야 함', async () => {
      // Given
      const error = RoleException.roleFetchError();
      roleService.findById.mockRejectedValue(error);

      // When
      const result = await controller.existsRole(mockData);

      // Then
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('TCP role existence check failed', {
        error: expect.any(String),
        roleId: 'role-123',
      });
    });
  });
});

