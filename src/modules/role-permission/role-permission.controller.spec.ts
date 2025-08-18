import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';

import { RoleIdParamsDto } from '@krgeobuk/shared/role/dtos';
import { PermissionIdParamsDto } from '@krgeobuk/shared/permission';
import { RolePermissionParamsDto } from '@krgeobuk/shared/role-permission';
import { PermissionIdsDto } from '@krgeobuk/role-permission/dtos';
import type { RolePermissionBatchAssignmentResult } from '@krgeobuk/role-permission/interfaces';
import { AccessTokenGuard } from '@krgeobuk/jwt/guards';
import { AuthorizationGuard } from '@krgeobuk/authorization/guards';
import { RolePermissionException } from '@krgeobuk/role-permission/exception';

import { RolePermissionController } from './role-permission.controller.js';
import { RolePermissionService } from './role-permission.service.js';

describe('RolePermissionController', () => {
  let controller: RolePermissionController;
  let mockRolePermissionService: jest.Mocked<RolePermissionService>;

  // 테스트 데이터 상수
  const mockRoleId = 'role-123';
  const mockPermissionId = 'permission-456';
  const mockPermissionIds = ['permission-456', 'permission-789', 'permission-abc'];
  const mockRoleIds = ['role-123', 'role-456', 'role-789'];

  const mockRoleIdParams: RoleIdParamsDto = {
    roleId: mockRoleId,
  };

  const mockPermissionIdParams: PermissionIdParamsDto = {
    permissionId: mockPermissionId,
  };

  const mockRolePermissionParams: RolePermissionParamsDto = {
    roleId: mockRoleId,
    permissionId: mockPermissionId,
  };

  const mockPermissionIdsDto: PermissionIdsDto = {
    permissionIds: mockPermissionIds,
  };

  const mockBatchAssignmentResult: RolePermissionBatchAssignmentResult = {
    success: true,
    affected: 2,
    details: {
      assigned: 2,
      skipped: 1,
      duplicates: ['permission-456'],
      newAssignments: ['permission-789', 'permission-abc'],
      roleId: mockRoleId,
      assignedPermissions: ['permission-789', 'permission-abc'],
    },
  };

  beforeEach(async () => {
    const mockService = {
      getPermissionIds: jest.fn(),
      getRoleIds: jest.fn(),
      exists: jest.fn(),
      assignRolePermission: jest.fn(),
      revokeRolePermission: jest.fn(),
      assignMultiplePermissions: jest.fn(),
      revokeMultiplePermissions: jest.fn(),
      replaceRolePermissions: jest.fn(),
    };

    const mockAccessTokenGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const mockAuthorizationGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolePermissionController],
      providers: [
        {
          provide: RolePermissionService,
          useValue: mockService,
        },
        {
          provide: AccessTokenGuard,
          useValue: mockAccessTokenGuard,
        },
        {
          provide: AuthorizationGuard,
          useValue: mockAuthorizationGuard,
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockAccessTokenGuard)
      .overrideGuard(AuthorizationGuard)
      .useValue(mockAuthorizationGuard)
      .compile();

    controller = module.get<RolePermissionController>(RolePermissionController);
    mockRolePermissionService = module.get(RolePermissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller 정의', () => {
    it('컨트롤러가 정의되어야 함', () => {
      expect(controller).toBeDefined();
    });
  });

  // ==================== 조회 API 테스트 ====================

  describe('getPermissionIdsByRoleId', () => {
    it('역할의 권한 ID 목록을 성공적으로 반환해야 함', async () => {
      // Given
      mockRolePermissionService.getPermissionIds.mockResolvedValue(mockPermissionIds);

      // When
      const result = await controller.getPermissionIdsByRoleId(mockRoleIdParams);

      // Then
      expect(result).toEqual(mockPermissionIds);
      expect(mockRolePermissionService.getPermissionIds).toHaveBeenCalledWith(mockRoleId);
      expect(mockRolePermissionService.getPermissionIds).toHaveBeenCalledTimes(1);
    });

    it('서비스 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = new Error('Service error');
      mockRolePermissionService.getPermissionIds.mockRejectedValue(mockError);

      // When & Then
      await expect(controller.getPermissionIdsByRoleId(mockRoleIdParams)).rejects.toThrow(
        'Service error'
      );
      expect(mockRolePermissionService.getPermissionIds).toHaveBeenCalledWith(mockRoleId);
    });
  });

  describe('getRoleIdsByPermissionId', () => {
    it('권한의 역할 ID 목록을 성공적으로 반환해야 함', async () => {
      // Given
      mockRolePermissionService.getRoleIds.mockResolvedValue(mockRoleIds);

      // When
      const result = await controller.getRoleIdsByPermissionId(mockPermissionIdParams);

      // Then
      expect(result).toEqual(mockRoleIds);
      expect(mockRolePermissionService.getRoleIds).toHaveBeenCalledWith(mockPermissionId);
      expect(mockRolePermissionService.getRoleIds).toHaveBeenCalledTimes(1);
    });

    it('서비스 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = new Error('Service error');
      mockRolePermissionService.getRoleIds.mockRejectedValue(mockError);

      // When & Then
      await expect(controller.getRoleIdsByPermissionId(mockPermissionIdParams)).rejects.toThrow(
        'Service error'
      );
      expect(mockRolePermissionService.getRoleIds).toHaveBeenCalledWith(mockPermissionId);
    });
  });

  describe('checkRolePermissionExists', () => {
    it('역할-권한 관계가 존재할 때 true를 반환해야 함', async () => {
      // Given
      mockRolePermissionService.exists.mockResolvedValue(true);

      // When
      const result = await controller.checkRolePermissionExists(mockRolePermissionParams);

      // Then
      expect(result).toBe(true);
      expect(mockRolePermissionService.exists).toHaveBeenCalledWith(mockRolePermissionParams);
      expect(mockRolePermissionService.exists).toHaveBeenCalledTimes(1);
    });

    it('역할-권한 관계가 존재하지 않을 때 false를 반환해야 함', async () => {
      // Given
      mockRolePermissionService.exists.mockResolvedValue(false);

      // When
      const result = await controller.checkRolePermissionExists(mockRolePermissionParams);

      // Then
      expect(result).toBe(false);
      expect(mockRolePermissionService.exists).toHaveBeenCalledWith(mockRolePermissionParams);
    });

    it('서비스 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = new Error('Service error');
      mockRolePermissionService.exists.mockRejectedValue(mockError);

      // When & Then
      await expect(controller.checkRolePermissionExists(mockRolePermissionParams)).rejects.toThrow(
        'Service error'
      );
      expect(mockRolePermissionService.exists).toHaveBeenCalledWith(mockRolePermissionParams);
    });
  });

  // ==================== 변경 API 테스트 ====================

  describe('assignRolePermission', () => {
    it('역할-권한 할당을 성공적으로 수행해야 함', async () => {
      // Given
      mockRolePermissionService.assignRolePermission.mockResolvedValue(undefined);

      // When
      await controller.assignRolePermission(mockRolePermissionParams);

      // Then
      expect(mockRolePermissionService.assignRolePermission).toHaveBeenCalledWith(
        mockRolePermissionParams
      );
      expect(mockRolePermissionService.assignRolePermission).toHaveBeenCalledTimes(1);
    });

    it('서비스에서 이미 존재하는 관계 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = new Error('Role permission already exists');
      mockRolePermissionService.assignRolePermission.mockRejectedValue(mockError);

      // When & Then
      await expect(controller.assignRolePermission(mockRolePermissionParams)).rejects.toThrow(
        'Role permission already exists'
      );
      expect(mockRolePermissionService.assignRolePermission).toHaveBeenCalledWith(
        mockRolePermissionParams
      );
    });

    it('일반적인 서비스 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = new Error('Assignment failed');
      mockRolePermissionService.assignRolePermission.mockRejectedValue(mockError);

      // When & Then
      await expect(controller.assignRolePermission(mockRolePermissionParams)).rejects.toThrow(
        'Assignment failed'
      );
      expect(mockRolePermissionService.assignRolePermission).toHaveBeenCalledWith(
        mockRolePermissionParams
      );
    });
  });

  describe('revokeRolePermission', () => {
    it('역할-권한 해제를 성공적으로 수행해야 함', async () => {
      // Given
      mockRolePermissionService.revokeRolePermission.mockResolvedValue(undefined);

      // When
      await controller.revokeRolePermission(mockRolePermissionParams);

      // Then
      expect(mockRolePermissionService.revokeRolePermission).toHaveBeenCalledWith(
        mockRolePermissionParams
      );
      expect(mockRolePermissionService.revokeRolePermission).toHaveBeenCalledTimes(1);
    });

    it('서비스에서 관계를 찾을 수 없는 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = new Error('Role permission not found');
      mockRolePermissionService.revokeRolePermission.mockRejectedValue(mockError);

      // When & Then
      await expect(controller.revokeRolePermission(mockRolePermissionParams)).rejects.toThrow(
        'Role permission not found'
      );
      expect(mockRolePermissionService.revokeRolePermission).toHaveBeenCalledWith(
        mockRolePermissionParams
      );
    });

    it('일반적인 서비스 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = new Error('Revoke failed');
      mockRolePermissionService.revokeRolePermission.mockRejectedValue(mockError);

      // When & Then
      await expect(controller.revokeRolePermission(mockRolePermissionParams)).rejects.toThrow(
        'Revoke failed'
      );
      expect(mockRolePermissionService.revokeRolePermission).toHaveBeenCalledWith(
        mockRolePermissionParams
      );
    });
  });

  // ==================== 배치 처리 API 테스트 ====================

  describe('assignMultiplePermissions', () => {
    it('여러 권한 할당을 성공적으로 수행해야 함', async () => {
      // Given
      mockRolePermissionService.assignMultiplePermissions.mockResolvedValue(
        mockBatchAssignmentResult
      );

      // When
      await controller.assignMultiplePermissions(mockRoleIdParams, mockPermissionIdsDto);

      // Then
      expect(mockRolePermissionService.assignMultiplePermissions).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionIds: mockPermissionIds,
      });
      expect(mockRolePermissionService.assignMultiplePermissions).toHaveBeenCalledTimes(1);
    });

    it('서비스에서 배치 할당 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = RolePermissionException.assignMultipleError();
      mockRolePermissionService.assignMultiplePermissions.mockRejectedValue(mockError);

      // When & Then
      await expect(
        controller.assignMultiplePermissions(mockRoleIdParams, mockPermissionIdsDto)
      ).rejects.toThrow(RolePermissionException.assignMultipleError());
      expect(mockRolePermissionService.assignMultiplePermissions).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionIds: mockPermissionIds,
      });
    });

    it('빈 권한 목록으로 배치 할당을 수행해야 함', async () => {
      // Given
      const emptyPermissionsDto: PermissionIdsDto = { permissionIds: [] };
      const emptyBatchResult: RolePermissionBatchAssignmentResult = {
        success: true,
        affected: 0,
        details: {
          assigned: 0,
          skipped: 0,
          duplicates: [],
          newAssignments: [],
          roleId: mockRoleId,
          assignedPermissions: [],
        },
      };
      mockRolePermissionService.assignMultiplePermissions.mockResolvedValue(emptyBatchResult);

      // When
      await controller.assignMultiplePermissions(mockRoleIdParams, emptyPermissionsDto);

      // Then
      expect(mockRolePermissionService.assignMultiplePermissions).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionIds: [],
      });
    });
  });

  describe('revokeMultiplePermissions', () => {
    it('여러 권한 해제를 성공적으로 수행해야 함', async () => {
      // Given
      mockRolePermissionService.revokeMultiplePermissions.mockResolvedValue(undefined);

      // When
      await controller.revokeMultiplePermissions(mockRoleIdParams, mockPermissionIdsDto);

      // Then
      expect(mockRolePermissionService.revokeMultiplePermissions).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionIds: mockPermissionIds,
      });
      expect(mockRolePermissionService.revokeMultiplePermissions).toHaveBeenCalledTimes(1);
    });

    it('서비스에서 배치 해제 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = RolePermissionException.revokeMultipleError();
      mockRolePermissionService.revokeMultiplePermissions.mockRejectedValue(mockError);

      // When & Then
      await expect(
        controller.revokeMultiplePermissions(mockRoleIdParams, mockPermissionIdsDto)
      ).rejects.toThrow(RolePermissionException.revokeMultipleError());
      expect(mockRolePermissionService.revokeMultiplePermissions).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionIds: mockPermissionIds,
      });
    });

    it('빈 권한 목록으로 배치 해제를 수행해야 함', async () => {
      // Given
      const emptyPermissionsDto: PermissionIdsDto = { permissionIds: [] };
      mockRolePermissionService.revokeMultiplePermissions.mockResolvedValue(undefined);

      // When
      await controller.revokeMultiplePermissions(mockRoleIdParams, emptyPermissionsDto);

      // Then
      expect(mockRolePermissionService.revokeMultiplePermissions).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionIds: [],
      });
    });
  });

  describe('replaceRolePermissions', () => {
    it('역할의 권한을 성공적으로 교체해야 함', async () => {
      // Given
      mockRolePermissionService.replaceRolePermissions.mockResolvedValue(undefined);

      // When
      await controller.replaceRolePermissions(mockRoleIdParams, mockPermissionIdsDto);

      // Then
      expect(mockRolePermissionService.replaceRolePermissions).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionIds: mockPermissionIds,
      });
      expect(mockRolePermissionService.replaceRolePermissions).toHaveBeenCalledTimes(1);
    });

    it('빈 권한 목록으로 교체할 때 모든 기존 권한이 제거되어야 함', async () => {
      // Given
      const emptyPermissionsDto: PermissionIdsDto = { permissionIds: [] };
      mockRolePermissionService.replaceRolePermissions.mockResolvedValue(undefined);

      // When
      await controller.replaceRolePermissions(mockRoleIdParams, emptyPermissionsDto);

      // Then
      expect(mockRolePermissionService.replaceRolePermissions).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionIds: [],
      });
    });

    it('서비스에서 교체 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = RolePermissionException.replaceError();
      mockRolePermissionService.replaceRolePermissions.mockRejectedValue(mockError);

      // When & Then
      await expect(
        controller.replaceRolePermissions(mockRoleIdParams, mockPermissionIdsDto)
      ).rejects.toThrow(RolePermissionException.replaceError());
      expect(mockRolePermissionService.replaceRolePermissions).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionIds: mockPermissionIds,
      });
    });

    it('새로운 권한 세트로 교체를 성공적으로 수행해야 함', async () => {
      // Given
      const newPermissionIds = ['permission-new-1', 'permission-new-2'];
      const newPermissionsDto: PermissionIdsDto = { permissionIds: newPermissionIds };
      mockRolePermissionService.replaceRolePermissions.mockResolvedValue(undefined);

      // When
      await controller.replaceRolePermissions(mockRoleIdParams, newPermissionsDto);

      // Then
      expect(mockRolePermissionService.replaceRolePermissions).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionIds: newPermissionIds,
      });
    });
  });

  // ==================== 에지 케이스 및 통합 테스트 ====================

  describe('파라미터 검증', () => {
    it('모든 엔드포인트에서 올바른 파라미터를 서비스로 전달해야 함', async () => {
      // Given
      mockRolePermissionService.getPermissionIds.mockResolvedValue([]);
      mockRolePermissionService.getRoleIds.mockResolvedValue([]);
      mockRolePermissionService.exists.mockResolvedValue(false);
      mockRolePermissionService.assignRolePermission.mockResolvedValue(undefined);
      mockRolePermissionService.revokeRolePermission.mockResolvedValue(undefined);
      mockRolePermissionService.assignMultiplePermissions.mockResolvedValue(
        mockBatchAssignmentResult
      );
      mockRolePermissionService.revokeMultiplePermissions.mockResolvedValue(undefined);
      mockRolePermissionService.replaceRolePermissions.mockResolvedValue(undefined);

      // When & Then
      await controller.getPermissionIdsByRoleId(mockRoleIdParams);
      expect(mockRolePermissionService.getPermissionIds).toHaveBeenCalledWith(mockRoleId);

      await controller.getRoleIdsByPermissionId(mockPermissionIdParams);
      expect(mockRolePermissionService.getRoleIds).toHaveBeenCalledWith(mockPermissionId);

      await controller.checkRolePermissionExists(mockRolePermissionParams);
      expect(mockRolePermissionService.exists).toHaveBeenCalledWith(mockRolePermissionParams);

      await controller.assignRolePermission(mockRolePermissionParams);
      expect(mockRolePermissionService.assignRolePermission).toHaveBeenCalledWith(
        mockRolePermissionParams
      );

      await controller.revokeRolePermission(mockRolePermissionParams);
      expect(mockRolePermissionService.revokeRolePermission).toHaveBeenCalledWith(
        mockRolePermissionParams
      );

      await controller.assignMultiplePermissions(mockRoleIdParams, mockPermissionIdsDto);
      expect(mockRolePermissionService.assignMultiplePermissions).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionIds: mockPermissionIds,
      });

      await controller.revokeMultiplePermissions(mockRoleIdParams, mockPermissionIdsDto);
      expect(mockRolePermissionService.revokeMultiplePermissions).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionIds: mockPermissionIds,
      });

      await controller.replaceRolePermissions(mockRoleIdParams, mockPermissionIdsDto);
      expect(mockRolePermissionService.replaceRolePermissions).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionIds: mockPermissionIds,
      });
    });
  });

  describe('서비스 의존성', () => {
    it('RolePermissionService에 대한 의존성이 올바르게 주입되어야 함', () => {
      expect(mockRolePermissionService).toBeDefined();
    });

    it('모든 서비스 메서드가 모킹되어 있어야 함', () => {
      expect(mockRolePermissionService.getPermissionIds).toBeDefined();
      expect(mockRolePermissionService.getRoleIds).toBeDefined();
      expect(mockRolePermissionService.exists).toBeDefined();
      expect(mockRolePermissionService.assignRolePermission).toBeDefined();
      expect(mockRolePermissionService.revokeRolePermission).toBeDefined();
      expect(mockRolePermissionService.assignMultiplePermissions).toBeDefined();
      expect(mockRolePermissionService.revokeMultiplePermissions).toBeDefined();
      expect(mockRolePermissionService.replaceRolePermissions).toBeDefined();
    });
  });
});
