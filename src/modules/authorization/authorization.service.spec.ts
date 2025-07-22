import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';

import { DataSource } from 'typeorm';

import { CheckPermission, CheckRole } from '@krgeobuk/authorization/interfaces';
import type { Service } from '@krgeobuk/shared/service';

import { UserRoleService } from '@modules/user-role/user-role.service.js';
import { RolePermissionService } from '@modules/role-permission/role-permission.service.js';
import { ServiceVisibleRoleService } from '@modules/service-visible-role/service-visible-role.service.js';
import { PermissionService } from '@modules/permission/permission.service.js';
import { RoleService } from '@modules/role/role.service.js';

import { AuthorizationService } from './authorization.service.js';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let userRoleService: jest.Mocked<UserRoleService>;
  let rolePermissionService: jest.Mocked<RolePermissionService>;
  let serviceVisibleRoleService: jest.Mocked<ServiceVisibleRoleService>;
  let permissionService: jest.Mocked<PermissionService>;
  let roleService: jest.Mocked<RoleService>;
  let portalClient: jest.Mocked<ClientProxy>;
  let mockLogger: jest.Mocked<Logger>;
  let mockQueryBuilder: jest.Mocked<{
    select: jest.Mock;
    from: jest.Mock;
    innerJoin: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    limit: jest.Mock;
    getRawMany: jest.Mock;
  }>;

  // 테스트 데이터
  const mockUserId = 'user-123';
  const mockServiceId = 'service-456';
  const mockAction = 'user:create';
  const mockRoleName = 'admin';

  const mockCheckPermission: CheckPermission = {
    userId: mockUserId,
    action: mockAction,
    serviceId: mockServiceId,
  };

  const mockCheckRole: CheckRole = {
    userId: mockUserId,
    roleName: mockRoleName,
    serviceId: mockServiceId,
  };

  const mockPermissions = [
    {
      id: 'permission-1',
      action: 'user:create',
      serviceId: 'service-456',
      description: 'Create user',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: 'permission-2',
      action: 'user:read',
      serviceId: 'service-456',
      description: 'Read user',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  const mockRoles = [
    {
      id: 'role-1',
      name: 'admin',
      description: 'Administrator role',
      serviceId: 'service-456',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: 'role-2',
      name: 'editor',
      description: 'Editor role',
      serviceId: 'service-456',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  const mockServices: Service[] = [
    {
      id: 'service-1',
      name: 'Auth Service',
      description: 'Authentication service',
      isVisible: true,
      isVisibleByRole: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: 'service-2',
      name: 'Admin Service',
      description: 'Admin service with role-based visibility',
      isVisible: true,
      isVisibleByRole: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  beforeEach(async () => {
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };

    const mockDataSource = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      getRawMany: jest.fn(),
    };

    const mockUserRoleService = {
      getRoleIds: jest.fn(),
    };

    const mockRolePermissionService = {
      getPermissionIdsBatch: jest.fn(),
    };

    const mockServiceVisibleRoleService = {
      getRoleIds: jest.fn(),
      getRoleIdsBatch: jest.fn(),
    };

    const mockPermissionService = {
      findByAnd: jest.fn(),
    };

    const mockRoleService = {
      findByIds: jest.fn(),
    };

    const mockPortalClient = {
      send: jest.fn(),
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
        AuthorizationService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: UserRoleService, useValue: mockUserRoleService },
        { provide: RolePermissionService, useValue: mockRolePermissionService },
        { provide: ServiceVisibleRoleService, useValue: mockServiceVisibleRoleService },
        { provide: PermissionService, useValue: mockPermissionService },
        { provide: RoleService, useValue: mockRoleService },
        { provide: 'PORTAL_SERVICE', useValue: mockPortalClient },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    userRoleService = module.get(UserRoleService);
    rolePermissionService = module.get(RolePermissionService);
    serviceVisibleRoleService = module.get(ServiceVisibleRoleService);
    permissionService = module.get(PermissionService);
    roleService = module.get(RoleService);
    portalClient = module.get('PORTAL_SERVICE');

    // Logger 모킹 설정
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

  describe('checkUserPermission', () => {
    it('사용자가 권한을 가지고 있으면 true를 반환해야 함', async () => {
      // Given
      mockQueryBuilder.getRawMany.mockResolvedValue([{ exists: 1 }]);

      // When
      const result = await service.checkUserPermission(mockCheckPermission);

      // Then
      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Permission granted',
        expect.objectContaining({
          userId: mockUserId,
          action: mockAction,
          serviceId: mockServiceId,
        })
      );
    });

    it('사용자가 권한을 가지고 있지 않으면 false를 반환해야 함 (통합 쿼리)', async () => {
      // Given
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // When
      const result = await service.checkUserPermission(mockCheckPermission);

      // Then
      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Permission denied',
        expect.objectContaining({
          userId: mockUserId,
          action: mockAction,
          serviceId: mockServiceId,
        })
      );
    });

    it('통합 쿼리 실패 시 폴백 로직을 사용해야 함', async () => {
      // Given - 통합 쿼리 실패
      mockQueryBuilder.getRawMany.mockRejectedValue(new Error('Query failed'));

      // 폴백 로직 모킹
      userRoleService.getRoleIds.mockResolvedValue(['role-1']);
      serviceVisibleRoleService.getRoleIds.mockResolvedValue(['role-1']);
      rolePermissionService.getPermissionIdsBatch.mockResolvedValue({
        'role-1': ['permission-1'],
      });
      permissionService.findByAnd.mockResolvedValue([mockPermissions[0]!]);

      // When
      const result = await service.checkUserPermission(mockCheckPermission);

      // Then
      expect(result).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Integrated query failed, falling back to multi-step approach',
        expect.any(Object)
      );
    });

    it('사용자에게 역할이 없으면 false를 반환해야 함', async () => {
      // Given
      mockQueryBuilder.getRawMany.mockRejectedValue(new Error('Query failed'));
      userRoleService.getRoleIds.mockResolvedValue([]);

      // When
      const result = await service.checkUserPermission(mockCheckPermission);

      // Then
      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith('No roles found for user', {
        userId: mockUserId,
      });
    });

    it('권한 체크 실패 시 보안상 false를 반환해야 함', async () => {
      // Given
      mockQueryBuilder.getRawMany.mockRejectedValue(new Error('Database error'));
      userRoleService.getRoleIds.mockRejectedValue(new Error('Service error'));

      // When
      const result = await service.checkUserPermission(mockCheckPermission);

      // Then
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Permission check failed', expect.any(Object));
    });
  });

  describe('checkUserRole', () => {
    it('사용자가 역할을 가지고 있으면 true를 반환해야 함', async () => {
      // Given
      userRoleService.getRoleIds.mockResolvedValue(['role-1']);
      serviceVisibleRoleService.getRoleIds.mockResolvedValue(['role-1']);
      roleService.findByIds.mockResolvedValue([mockRoles[0]!]);

      // When
      const result = await service.checkUserRole(mockCheckRole);

      // Then
      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Role granted',
        expect.objectContaining({
          userId: mockUserId,
          roleName: mockRoleName,
          serviceId: mockServiceId,
        })
      );
    });

    it('사용자가 역할을 가지고 있지 않으면 false를 반환해야 함', async () => {
      // Given
      userRoleService.getRoleIds.mockResolvedValue(['role-2']);
      serviceVisibleRoleService.getRoleIds.mockResolvedValue(['role-2']);
      roleService.findByIds.mockResolvedValue([mockRoles[1]!]); // editor 역할

      // When
      const result = await service.checkUserRole(mockCheckRole);

      // Then
      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Role denied',
        expect.objectContaining({
          userId: mockUserId,
          roleName: mockRoleName,
          serviceId: mockServiceId,
        })
      );
    });

    it('대소문자 구분 없이 역할을 매칭해야 함', async () => {
      // Given
      const upperCaseRoleCheck = { ...mockCheckRole, roleName: 'ADMIN' };
      userRoleService.getRoleIds.mockResolvedValue(['role-1']);
      serviceVisibleRoleService.getRoleIds.mockResolvedValue(['role-1']);
      roleService.findByIds.mockResolvedValue([mockRoles[0]!]); // admin 역할

      // When
      const result = await service.checkUserRole(upperCaseRoleCheck);

      // Then
      expect(result).toBe(true);
    });

    it('역할 체크 실패 시 보안상 false를 반환해야 함', async () => {
      // Given
      userRoleService.getRoleIds.mockRejectedValue(new Error('Service error'));

      // When
      const result = await service.checkUserRole(mockCheckRole);

      // Then
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Role check failed', expect.any(Object));
    });
  });

  describe('getUserPermissions', () => {
    it('사용자의 모든 권한을 조회해야 함', async () => {
      // Given
      userRoleService.getRoleIds.mockResolvedValue(['role-1', 'role-2']);
      serviceVisibleRoleService.getRoleIds.mockResolvedValue(['role-1', 'role-2']);
      rolePermissionService.getPermissionIdsBatch.mockResolvedValue({
        'role-1': ['permission-1'],
        'role-2': ['permission-2'],
      });

      // When
      const result = await service.getUserPermissions(mockUserId, mockServiceId);

      // Then
      expect(result).toEqual(['permission-1', 'permission-2']);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'User permissions retrieved',
        expect.objectContaining({
          userId: mockUserId,
          serviceId: mockServiceId,
          permissionCount: 2,
        })
      );
    });

    it('사용자에게 역할이 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      userRoleService.getRoleIds.mockResolvedValue([]);

      // When
      const result = await service.getUserPermissions(mockUserId, mockServiceId);

      // Then
      expect(result).toEqual([]);
    });

    it('권한 조회 실패 시 빈 배열을 반환해야 함', async () => {
      // Given
      userRoleService.getRoleIds.mockRejectedValue(new Error('Service error'));

      // When
      const result = await service.getUserPermissions(mockUserId, mockServiceId);

      // Then
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'User permissions retrieval failed',
        expect.any(Object)
      );
    });
  });

  describe('getUserRoles', () => {
    it('사용자의 모든 역할을 조회해야 함', async () => {
      // Given
      userRoleService.getRoleIds.mockResolvedValue(['role-1', 'role-2']);
      serviceVisibleRoleService.getRoleIds.mockResolvedValue(['role-1']);

      // When
      const result = await service.getUserRoles(mockUserId, mockServiceId);

      // Then
      expect(result).toEqual(['role-1']);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'User roles retrieved',
        expect.objectContaining({
          userId: mockUserId,
          serviceId: mockServiceId,
          roleCount: 1,
        })
      );
    });

    it('serviceId가 없으면 모든 사용자 역할을 반환해야 함', async () => {
      // Given
      userRoleService.getRoleIds.mockResolvedValue(['role-1', 'role-2']);

      // When
      const result = await service.getUserRoles(mockUserId);

      // Then
      expect(result).toEqual(['role-1', 'role-2']);
    });

    it('역할 조회 실패 시 빈 배열을 반환해야 함', async () => {
      // Given
      userRoleService.getRoleIds.mockRejectedValue(new Error('Service error'));

      // When
      const result = await service.getUserRoles(mockUserId, mockServiceId);

      // Then
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'User roles retrieval failed',
        expect.any(Object)
      );
    });
  });

  describe('hasAnyPermission', () => {
    it('여러 권한 중 하나라도 있으면 true를 반환해야 함', async () => {
      // Given
      const actions = ['user:create', 'user:read'];

      // 첫 번째 권한만 허용
      jest
        .spyOn(service, 'checkUserPermission')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      // When
      const result = await service.hasAnyPermission(mockUserId, actions, mockServiceId);

      // Then
      expect(result).toBe(true);
      expect(service.checkUserPermission).toHaveBeenCalledTimes(2);
    });

    it('모든 권한이 없으면 false를 반환해야 함', async () => {
      // Given
      const actions = ['user:create', 'user:read'];
      jest.spyOn(service, 'checkUserPermission').mockResolvedValue(false);

      // When
      const result = await service.hasAnyPermission(mockUserId, actions, mockServiceId);

      // Then
      expect(result).toBe(false);
    });

    it('빈 배열이면 true를 반환해야 함', async () => {
      // When
      const result = await service.hasAnyPermission(mockUserId, [], mockServiceId);

      // Then
      expect(result).toBe(true);
    });
  });

  describe('getAvailableServices', () => {
    it('사용자가 접근 가능한 서비스 목록을 조회해야 함', async () => {
      // Given
      jest.spyOn(service, 'getUserRoles').mockResolvedValue(['role-1']);
      portalClient.send.mockReturnValue(of(mockServices));
      serviceVisibleRoleService.getRoleIdsBatch.mockResolvedValue({
        'service-2': ['role-1'],
      });

      // When
      const result = await service.getAvailableServices(mockUserId);

      // Then
      expect(result).toHaveLength(2); // 전체 공개 서비스 + 권한 기반 서비스
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'service-1' }), // 전체 공개
          expect.objectContaining({ id: 'service-2' }), // 권한 기반 (역할 매칭)
        ])
      );
    });

    it('포털 서비스 통신 실패 시 빈 배열을 반환해야 함', async () => {
      // Given
      jest.spyOn(service, 'getUserRoles').mockResolvedValue(['role-1']);
      portalClient.send.mockReturnValue(
        throwError(() => new Error('Portal service unavailable'))
      );

      // When
      const result = await service.getAvailableServices(mockUserId);

      // Then
      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'portal-server에서 서비스 목록 조회 실패, 임시 데이터 사용',
        expect.any(Object)
      );
    });
  });

  it('서비스가 정의되어야 함', () => {
    expect(service).toBeDefined();
  });
});

