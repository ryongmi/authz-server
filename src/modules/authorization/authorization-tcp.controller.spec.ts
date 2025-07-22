import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import {
  TcpCheckPermission,
  TcpCheckRole,
  TcpGetUserRoles,
  TcpGetUserPermissions,
} from '@krgeobuk/authorization/tcp/interfaces';
import { AuthorizationException } from '@krgeobuk/authorization/exception';
import type { Service } from '@krgeobuk/shared/service';

import { AuthorizationTcpController } from './authorization-tcp.controller.js';
import { AuthorizationService } from './authorization.service.js';

describe('AuthorizationTcpController', () => {
  let controller: AuthorizationTcpController;
  let authorizationService: jest.Mocked<AuthorizationService>;
  let mockLogger: jest.Mocked<Logger>;

  // 테스트 데이터
  const mockTcpCheckPermission: TcpCheckPermission = {
    userId: 'user-123',
    action: 'user:create',
    serviceId: 'service-456',
  };

  const mockTcpCheckRole: TcpCheckRole = {
    userId: 'user-123',
    roleName: 'admin',
    serviceId: 'service-456',
  };

  const mockTcpGetUserPermissions: TcpGetUserPermissions = {
    userId: 'user-123',
    serviceId: 'service-456',
  };

  const mockTcpGetUserRoles: TcpGetUserRoles = {
    userId: 'user-123',
    serviceId: 'service-456',
  };

  const mockGetAvailableServices = {
    userId: 'user-123',
  };

  const mockPermissions = ['user:create', 'user:read', 'user:update'];
  const mockRoles = ['admin', 'editor', 'viewer'];
  const mockServices: Service[] = [
    {
      id: 'service-1',
      name: 'Auth Service',
      description: 'Authentication service',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: 'service-2',
      name: 'User Service',
      description: 'User management service',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  beforeEach(async () => {
    const mockAuthorizationService = {
      checkUserPermission: jest.fn(),
      checkUserRole: jest.fn(),
      getUserPermissions: jest.fn(),
      getUserRoles: jest.fn(),
      getAvailableServices: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthorizationTcpController],
      providers: [
        {
          provide: AuthorizationService,
          useValue: mockAuthorizationService,
        },
      ],
    }).compile();

    controller = module.get<AuthorizationTcpController>(AuthorizationTcpController);
    authorizationService = module.get(AuthorizationService);

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

  describe('checkPermission', () => {
    it('TCP 권한 체크 요청을 처리하고 권한이 있으면 true를 반환해야 함', async () => {
      // Given
      authorizationService.checkUserPermission.mockResolvedValue(true);

      // When
      const result = await controller.checkPermission(mockTcpCheckPermission);

      // Then
      expect(result).toEqual({ hasPermission: true });
      expect(authorizationService.checkUserPermission).toHaveBeenCalledWith(mockTcpCheckPermission);
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP permission check requested', {
        userId: 'user-123',
        action: 'user:create',
        serviceId: 'service-456',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP permission check completed', {
        userId: 'user-123',
        action: 'user:create',
        serviceId: 'service-456',
        hasPermission: true,
      });
    });

    it('TCP 권한 체크 요청을 처리하고 권한이 없으면 false를 반환해야 함', async () => {
      // Given
      authorizationService.checkUserPermission.mockResolvedValue(false);

      // When
      const result = await controller.checkPermission(mockTcpCheckPermission);

      // Then
      expect(result).toEqual({ hasPermission: false });
      expect(authorizationService.checkUserPermission).toHaveBeenCalledWith(mockTcpCheckPermission);
    });

    it('TCP 권한 체크 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = AuthorizationException.serviceUnavailable();
      authorizationService.checkUserPermission.mockRejectedValue(error);

      // When & Then
      await expect(controller.checkPermission(mockTcpCheckPermission)).rejects.toThrow(
        AuthorizationException.serviceUnavailable()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP permission check failed', {
        error: expect.any(String),
        userId: 'user-123',
        action: 'user:create',
        serviceId: 'service-456',
      });
    });
  });

  describe('checkRole', () => {
    it('TCP 역할 체크 요청을 처리하고 역할이 있으면 true를 반환해야 함', async () => {
      // Given
      authorizationService.checkUserRole.mockResolvedValue(true);

      // When
      const result = await controller.checkRole(mockTcpCheckRole);

      // Then
      expect(result).toEqual({ hasRole: true });
      expect(authorizationService.checkUserRole).toHaveBeenCalledWith(mockTcpCheckRole);
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP role check requested', {
        userId: 'user-123',
        roleName: 'admin',
        serviceId: 'service-456',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP role check completed', {
        userId: 'user-123',
        roleName: 'admin',
        serviceId: 'service-456',
        hasRole: true,
      });
    });

    it('TCP 역할 체크 요청을 처리하고 역할이 없으면 false를 반환해야 함', async () => {
      // Given
      authorizationService.checkUserRole.mockResolvedValue(false);

      // When
      const result = await controller.checkRole(mockTcpCheckRole);

      // Then
      expect(result).toEqual({ hasRole: false });
      expect(authorizationService.checkUserRole).toHaveBeenCalledWith(mockTcpCheckRole);
    });

    it('TCP 역할 체크 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = AuthorizationException.serviceUnavailable();
      authorizationService.checkUserRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.checkRole(mockTcpCheckRole)).rejects.toThrow(
        AuthorizationException.serviceUnavailable()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP role check failed', {
        error: expect.any(String),
        userId: 'user-123',
        roleName: 'admin',
        serviceId: 'service-456',
      });
    });
  });

  describe('getUserPermissions', () => {
    it('TCP 사용자 권한 조회 요청을 처리해야 함', async () => {
      // Given
      authorizationService.getUserPermissions.mockResolvedValue(mockPermissions);

      // When
      const result = await controller.getUserPermissions(mockTcpGetUserPermissions);

      // Then
      expect(result).toEqual(mockPermissions);
      expect(authorizationService.getUserPermissions).toHaveBeenCalledWith(
        'user-123',
        'service-456'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP user permissions requested', {
        userId: 'user-123',
        serviceId: 'service-456',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP user permissions retrieved', {
        userId: 'user-123',
        serviceId: 'service-456',
        permissionCount: 3,
      });
    });

    it('사용자에게 권한이 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      authorizationService.getUserPermissions.mockResolvedValue([]);

      // When
      const result = await controller.getUserPermissions(mockTcpGetUserPermissions);

      // Then
      expect(result).toEqual([]);
      expect(authorizationService.getUserPermissions).toHaveBeenCalledWith(
        'user-123',
        'service-456'
      );
    });

    it('TCP 사용자 권한 조회 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = AuthorizationException.serviceUnavailable();
      authorizationService.getUserPermissions.mockRejectedValue(error);

      // When & Then
      await expect(controller.getUserPermissions(mockTcpGetUserPermissions)).rejects.toThrow(
        AuthorizationException.serviceUnavailable()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP user permissions retrieval failed', {
        error: expect.any(String),
        userId: 'user-123',
        serviceId: 'service-456',
      });
    });
  });

  describe('getUserRoles', () => {
    it('TCP 사용자 역할 조회 요청을 처리해야 함', async () => {
      // Given
      authorizationService.getUserRoles.mockResolvedValue(mockRoles);

      // When
      const result = await controller.getUserRoles(mockTcpGetUserRoles);

      // Then
      expect(result).toEqual(mockRoles);
      expect(authorizationService.getUserRoles).toHaveBeenCalledWith('user-123', 'service-456');
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP user roles requested', {
        userId: 'user-123',
        serviceId: 'service-456',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP user roles retrieved', {
        userId: 'user-123',
        serviceId: 'service-456',
        roleCount: 3,
      });
    });

    it('사용자에게 역할이 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      authorizationService.getUserRoles.mockResolvedValue([]);

      // When
      const result = await controller.getUserRoles(mockTcpGetUserRoles);

      // Then
      expect(result).toEqual([]);
      expect(authorizationService.getUserRoles).toHaveBeenCalledWith('user-123', 'service-456');
    });

    it('TCP 사용자 역할 조회 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = AuthorizationException.serviceUnavailable();
      authorizationService.getUserRoles.mockRejectedValue(error);

      // When & Then
      await expect(controller.getUserRoles(mockTcpGetUserRoles)).rejects.toThrow(
        AuthorizationException.serviceUnavailable()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP user roles retrieval failed', {
        error: expect.any(String),
        userId: 'user-123',
        serviceId: 'service-456',
      });
    });
  });

  describe('getAvailableServices', () => {
    it('TCP 사용 가능한 서비스 조회 요청을 처리해야 함', async () => {
      // Given
      authorizationService.getAvailableServices.mockResolvedValue(mockServices);

      // When
      const result = await controller.getAvailableServices(mockGetAvailableServices);

      // Then
      expect(result).toEqual(mockServices);
      expect(authorizationService.getAvailableServices).toHaveBeenCalledWith('user-123');
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP available services requested', {
        userId: 'user-123',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP available services retrieved', {
        userId: 'user-123',
        serviceCount: 2,
      });
    });

    it('사용자에게 이용 가능한 서비스가 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      authorizationService.getAvailableServices.mockResolvedValue([]);

      // When
      const result = await controller.getAvailableServices(mockGetAvailableServices);

      // Then
      expect(result).toEqual([]);
      expect(authorizationService.getAvailableServices).toHaveBeenCalledWith('user-123');
    });

    it('TCP 사용 가능한 서비스 조회 실패 시 빈 배열을 반환해야 함 (fallback)', async () => {
      // Given
      const error = AuthorizationException.serviceUnavailable();
      authorizationService.getAvailableServices.mockRejectedValue(error);

      // When
      const result = await controller.getAvailableServices(mockGetAvailableServices);

      // Then
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith('TCP available services retrieval failed', {
        error: expect.any(String),
        userId: 'user-123',
      });
    });
  });

  it('TCP 컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });
});
