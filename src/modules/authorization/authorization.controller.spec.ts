import { Test, TestingModule } from '@nestjs/testing';

import { AccessTokenGuard } from '@krgeobuk/jwt/guards';

import { CheckPermissionDto, CheckRoleDto } from '@krgeobuk/authorization/dtos';
import { AuthorizationException } from '@krgeobuk/authorization/exception';
import { UserIdParamsDto } from '@krgeobuk/shared/user';

import { AuthorizationController } from './authorization.controller.js';
import { AuthorizationService } from './authorization.service.js';

describe('AuthorizationController', () => {
  let controller: AuthorizationController;
  let authorizationService: jest.Mocked<AuthorizationService>;

  // 테스트 데이터
  const mockCheckPermissionDto: CheckPermissionDto = {
    userId: 'user-123',
    action: 'user:create',
    serviceId: 'service-456',
  };

  const mockCheckRoleDto: CheckRoleDto = {
    userId: 'user-123',
    roleName: 'admin',
    serviceId: 'service-456',
  };

  const mockUserIdParams: UserIdParamsDto = {
    userId: 'user-123',
  };

  const mockPermissions = ['permission-1', 'permission-2', 'permission-3'];
  const mockRoles = ['role-1', 'role-2'];

  beforeEach(async () => {
    const mockAuthorizationService = {
      checkUserPermission: jest.fn(),
      checkUserRole: jest.fn(),
      getUserPermissions: jest.fn(),
      getUserRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthorizationController],
      providers: [
        {
          provide: AuthorizationService,
          useValue: mockAuthorizationService,
        },
      ],
    })
    .overrideGuard(AccessTokenGuard)
    .useValue({
      canActivate: jest.fn().mockReturnValue(true),
    })
    .compile();

    controller = module.get<AuthorizationController>(AuthorizationController);
    authorizationService = module.get(AuthorizationService);

  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkPermission', () => {
    it('사용자 권한 확인 요청을 처리하고 권한이 있으면 true를 반환해야 함', async () => {
      // Given
      authorizationService.checkUserPermission.mockResolvedValue(true);

      // When
      const result = await controller.checkPermission(mockCheckPermissionDto);

      // Then
      expect(result).toEqual({ hasPermission: true });
      expect(authorizationService.checkUserPermission).toHaveBeenCalledWith(mockCheckPermissionDto);
    });

    it('사용자 권한 확인 요청을 처리하고 권한이 없으면 false를 반환해야 함', async () => {
      // Given
      authorizationService.checkUserPermission.mockResolvedValue(false);

      // When
      const result = await controller.checkPermission(mockCheckPermissionDto);

      // Then
      expect(result).toEqual({ hasPermission: false });
      expect(authorizationService.checkUserPermission).toHaveBeenCalledWith(mockCheckPermissionDto);
    });

    it('serviceId가 없는 권한 확인 요청을 처리해야 함', async () => {
      // Given
      const permissionWithoutService: CheckPermissionDto = {
        userId: 'user-123',
        action: 'user:create',
      };
      authorizationService.checkUserPermission.mockResolvedValue(true);

      // When
      const result = await controller.checkPermission(permissionWithoutService);

      // Then
      expect(result).toEqual({ hasPermission: true });
      expect(authorizationService.checkUserPermission).toHaveBeenCalledWith(permissionWithoutService);
    });

    it('권한 확인 실패 시 에러를 전파해야 함', async () => {
      // Given
      const error = AuthorizationException.serviceUnavailable();
      authorizationService.checkUserPermission.mockRejectedValue(error);

      // When & Then
      await expect(controller.checkPermission(mockCheckPermissionDto)).rejects.toThrow(
        AuthorizationException.serviceUnavailable()
      );
      expect(authorizationService.checkUserPermission).toHaveBeenCalledWith(mockCheckPermissionDto);
    });
  });

  describe('checkRole', () => {
    it('사용자 역할 확인 요청을 처리하고 역할이 있으면 true를 반환해야 함', async () => {
      // Given
      authorizationService.checkUserRole.mockResolvedValue(true);

      // When
      const result = await controller.checkRole(mockCheckRoleDto);

      // Then
      expect(result).toEqual({ hasRole: true });
      expect(authorizationService.checkUserRole).toHaveBeenCalledWith(mockCheckRoleDto);
    });

    it('사용자 역할 확인 요청을 처리하고 역할이 없으면 false를 반환해야 함', async () => {
      // Given
      authorizationService.checkUserRole.mockResolvedValue(false);

      // When
      const result = await controller.checkRole(mockCheckRoleDto);

      // Then
      expect(result).toEqual({ hasRole: false });
      expect(authorizationService.checkUserRole).toHaveBeenCalledWith(mockCheckRoleDto);
    });

    it('serviceId가 없는 역할 확인 요청을 처리해야 함', async () => {
      // Given
      const roleWithoutService: CheckRoleDto = {
        userId: 'user-123',
        roleName: 'admin',
      };
      authorizationService.checkUserRole.mockResolvedValue(true);

      // When
      const result = await controller.checkRole(roleWithoutService);

      // Then
      expect(result).toEqual({ hasRole: true });
      expect(authorizationService.checkUserRole).toHaveBeenCalledWith(roleWithoutService);
    });

    it('역할 확인 실패 시 에러를 전파해야 함', async () => {
      // Given
      const error = AuthorizationException.serviceUnavailable();
      authorizationService.checkUserRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.checkRole(mockCheckRoleDto)).rejects.toThrow(
        AuthorizationException.serviceUnavailable()
      );
      expect(authorizationService.checkUserRole).toHaveBeenCalledWith(mockCheckRoleDto);
    });
  });

  describe('getUserPermissions', () => {
    it('사용자 권한 목록 조회 요청을 처리해야 함', async () => {
      // Given
      authorizationService.getUserPermissions.mockResolvedValue(mockPermissions);

      // When
      const result = await controller.getUserPermissions(mockUserIdParams);

      // Then
      expect(result).toEqual(mockPermissions);
      expect(authorizationService.getUserPermissions).toHaveBeenCalledWith('user-123');
    });

    it('사용자에게 권한이 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      authorizationService.getUserPermissions.mockResolvedValue([]);

      // When
      const result = await controller.getUserPermissions(mockUserIdParams);

      // Then
      expect(result).toEqual([]);
      expect(authorizationService.getUserPermissions).toHaveBeenCalledWith('user-123');
    });

    it('사용자 권한 조회 실패 시 에러를 전파해야 함', async () => {
      // Given
      const error = AuthorizationException.serviceUnavailable();
      authorizationService.getUserPermissions.mockRejectedValue(error);

      // When & Then
      await expect(controller.getUserPermissions(mockUserIdParams)).rejects.toThrow(
        AuthorizationException.serviceUnavailable()
      );
      expect(authorizationService.getUserPermissions).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getUserRoles', () => {
    it('사용자 역할 목록 조회 요청을 처리해야 함', async () => {
      // Given
      authorizationService.getUserRoles.mockResolvedValue(mockRoles);

      // When
      const result = await controller.getUserRoles(mockUserIdParams);

      // Then
      expect(result).toEqual(mockRoles);
      expect(authorizationService.getUserRoles).toHaveBeenCalledWith('user-123');
    });

    it('사용자에게 역할이 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      authorizationService.getUserRoles.mockResolvedValue([]);

      // When
      const result = await controller.getUserRoles(mockUserIdParams);

      // Then
      expect(result).toEqual([]);
      expect(authorizationService.getUserRoles).toHaveBeenCalledWith('user-123');
    });

    it('사용자 역할 조회 실패 시 에러를 전파해야 함', async () => {
      // Given
      const error = AuthorizationException.serviceUnavailable();
      authorizationService.getUserRoles.mockRejectedValue(error);

      // When & Then
      await expect(controller.getUserRoles(mockUserIdParams)).rejects.toThrow(
        AuthorizationException.serviceUnavailable()
      );
      expect(authorizationService.getUserRoles).toHaveBeenCalledWith('user-123');
    });
  });

  it('컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });
});

