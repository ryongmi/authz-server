import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import type { TcpRoleId } from '@krgeobuk/role/tcp/interfaces';
import type { TcpPermissionId } from '@krgeobuk/permission/tcp/interfaces';
import type {
  TcpRolePermission,
  TcpRolePermissionBatch,
} from '@krgeobuk/role-permission/tcp/interfaces';
import type { RolePermissionBatchAssignmentResult } from '@krgeobuk/role-permission/interfaces';
import { RolePermissionException } from '@krgeobuk/role-permission/exception';

import { RolePermissionTcpController } from './role-permission-tcp.controller.js';
import { RolePermissionService } from './role-permission.service.js';

describe('RolePermissionTcpController', () => {
  let controller: RolePermissionTcpController;
  let rolePermissionService: jest.Mocked<RolePermissionService>;
  let mockLogger: jest.Mocked<Logger>;

  // 테스트 데이터
  const mockTcpRoleId: TcpRoleId = {
    roleId: 'role-123',
  };

  const mockTcpPermissionId: TcpPermissionId = {
    permissionId: 'permission-456',
  };

  const mockTcpRolePermission: TcpRolePermission = {
    roleId: 'role-123',
    permissionId: 'permission-456',
  };

  const mockTcpRolePermissionBatch: TcpRolePermissionBatch = {
    roleId: 'role-123',
    permissionIds: ['permission-1', 'permission-2', 'permission-3'],
  };

  const mockBatchAssignmentResult: RolePermissionBatchAssignmentResult = {
    success: true,
    affected: 2,
    details: {
      assigned: 2,
      skipped: 0,
      duplicates: [],
      newAssignments: ['permission-1', 'permission-2'],
      roleId: 'role-123',
      assignedPermissions: ['permission-1', 'permission-2'],
    },
  };

  beforeEach(async () => {
    const mockRolePermissionService = {
      getPermissionIds: jest.fn(),
      getRoleIds: jest.fn(),
      exists: jest.fn(),
      assignMultiplePermissions: jest.fn(),
      revokeMultiplePermissions: jest.fn(),
      replaceRolePermissions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolePermissionTcpController],
      providers: [
        {
          provide: RolePermissionService,
          useValue: mockRolePermissionService,
        },
      ],
    }).compile();

    controller = module.get<RolePermissionTcpController>(RolePermissionTcpController);
    rolePermissionService = module.get(RolePermissionService);

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

  describe('findPermissionIdsByRoleId', () => {
    it('TCP 역할별 권한 ID 조회 요청을 처리해야 함', async () => {
      // Given
      const permissionIds = ['permission-1', 'permission-2', 'permission-3'];
      rolePermissionService.getPermissionIds.mockResolvedValue(permissionIds);

      // When
      const result = await controller.findPermissionIdsByRoleId(mockTcpRoleId);

      // Then
      expect(result).toEqual(permissionIds);
      expect(rolePermissionService.getPermissionIds).toHaveBeenCalledWith('role-123');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'TCP role-permission find permissions by role requested',
        { roleId: 'role-123' }
      );
    });

    it('역할에 할당된 권한이 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      rolePermissionService.getPermissionIds.mockResolvedValue([]);

      // When
      const result = await controller.findPermissionIdsByRoleId(mockTcpRoleId);

      // Then
      expect(result).toEqual([]);
      expect(rolePermissionService.getPermissionIds).toHaveBeenCalledWith('role-123');
    });

    it('TCP 역할별 권한 조회 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = RolePermissionException.fetchError();
      rolePermissionService.getPermissionIds.mockRejectedValue(error);

      // When & Then
      await expect(controller.findPermissionIdsByRoleId(mockTcpRoleId)).rejects.toThrow(
        RolePermissionException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TCP role-permission find permissions by role failed',
        {
          error: expect.any(String),
          roleId: 'role-123',
        }
      );
    });
  });

  describe('findRoleIdsByPermissionId', () => {
    it('TCP 권한별 역할 ID 조회 요청을 처리해야 함', async () => {
      // Given
      const roleIds = ['role-1', 'role-2', 'role-3'];
      rolePermissionService.getRoleIds.mockResolvedValue(roleIds);

      // When
      const result = await controller.findRoleIdsByPermissionId(mockTcpPermissionId);

      // Then
      expect(result).toEqual(roleIds);
      expect(rolePermissionService.getRoleIds).toHaveBeenCalledWith('permission-456');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'TCP role-permission find roles by permission requested',
        { permissionId: 'permission-456' }
      );
    });

    it('권한에 할당된 역할이 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      rolePermissionService.getRoleIds.mockResolvedValue([]);

      // When
      const result = await controller.findRoleIdsByPermissionId(mockTcpPermissionId);

      // Then
      expect(result).toEqual([]);
      expect(rolePermissionService.getRoleIds).toHaveBeenCalledWith('permission-456');
    });

    it('TCP 권한별 역할 조회 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = RolePermissionException.fetchError();
      rolePermissionService.getRoleIds.mockRejectedValue(error);

      // When & Then
      await expect(controller.findRoleIdsByPermissionId(mockTcpPermissionId)).rejects.toThrow(
        RolePermissionException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TCP role-permission find roles by permission failed',
        {
          error: expect.any(String),
          permissionId: 'permission-456',
        }
      );
    });
  });

  describe('existsRolePermission', () => {
    it('TCP 역할-권한 관계 존재 확인 요청을 처리해야 함', async () => {
      // Given
      rolePermissionService.exists.mockResolvedValue(true);

      // When
      const result = await controller.existsRolePermission(mockTcpRolePermission);

      // Then
      expect(result).toBe(true);
      expect(rolePermissionService.exists).toHaveBeenCalledWith(mockTcpRolePermission);
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP role-permission exists check requested', {
        roleId: 'role-123',
        permissionId: 'permission-456',
      });
    });

    it('역할-권한 관계가 존재하지 않으면 false를 반환해야 함', async () => {
      // Given
      rolePermissionService.exists.mockResolvedValue(false);

      // When
      const result = await controller.existsRolePermission(mockTcpRolePermission);

      // Then
      expect(result).toBe(false);
      expect(rolePermissionService.exists).toHaveBeenCalledWith(mockTcpRolePermission);
    });

    it('TCP 역할-권한 존재 확인 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = RolePermissionException.fetchError();
      rolePermissionService.exists.mockRejectedValue(error);

      // When & Then
      await expect(controller.existsRolePermission(mockTcpRolePermission)).rejects.toThrow(
        RolePermissionException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP role-permission exists check failed', {
        error: expect.any(String),
        roleId: 'role-123',
        permissionId: 'permission-456',
      });
    });
  });

  describe('assignMultiplePermissions', () => {
    it('TCP 여러 권한 할당 요청을 처리해야 함', async () => {
      // Given
      rolePermissionService.assignMultiplePermissions.mockResolvedValue(mockBatchAssignmentResult);

      // When
      const result = await controller.assignMultiplePermissions(mockTcpRolePermissionBatch);

      // Then
      expect(result).toEqual({ success: true });
      expect(rolePermissionService.assignMultiplePermissions).toHaveBeenCalledWith(
        mockTcpRolePermissionBatch
      );
      expect(mockLogger.log).toHaveBeenCalledWith('TCP role-permission assign multiple requested', {
        roleId: 'role-123',
        permissionCount: 3,
      });
    });

    it('빈 권한 목록으로 배치 할당 요청을 처리해야 함', async () => {
      // Given
      const emptyBatchData: TcpRolePermissionBatch = {
        roleId: 'role-123',
        permissionIds: [],
      };
      const emptyBatchResult: RolePermissionBatchAssignmentResult = {
        success: true,
        affected: 0,
        details: {
          assigned: 0,
          skipped: 0,
          duplicates: [],
          newAssignments: [],
          roleId: 'role-123',
          assignedPermissions: [],
        },
      };
      rolePermissionService.assignMultiplePermissions.mockResolvedValue(emptyBatchResult);

      // When
      const result = await controller.assignMultiplePermissions(emptyBatchData);

      // Then
      expect(result).toEqual({ success: true });
      expect(rolePermissionService.assignMultiplePermissions).toHaveBeenCalledWith(emptyBatchData);
      expect(mockLogger.log).toHaveBeenCalledWith('TCP role-permission assign multiple requested', {
        roleId: 'role-123',
        permissionCount: 0,
      });
    });

    it('TCP 여러 권한 할당 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = RolePermissionException.assignMultipleError();
      rolePermissionService.assignMultiplePermissions.mockRejectedValue(error);

      // When & Then
      await expect(
        controller.assignMultiplePermissions(mockTcpRolePermissionBatch)
      ).rejects.toThrow(RolePermissionException.assignMultipleError());
      expect(mockLogger.error).toHaveBeenCalledWith('TCP role-permission assign multiple failed', {
        error: expect.any(String),
        roleId: 'role-123',
        permissionCount: 3,
      });
    });
  });

  describe('revokeMultiplePermissions', () => {
    it('TCP 여러 권한 해제 요청을 처리해야 함', async () => {
      // Given
      rolePermissionService.revokeMultiplePermissions.mockResolvedValue(undefined);

      // When
      const result = await controller.revokeMultiplePermissions(mockTcpRolePermissionBatch);

      // Then
      expect(result).toEqual({ success: true });
      expect(rolePermissionService.revokeMultiplePermissions).toHaveBeenCalledWith(
        mockTcpRolePermissionBatch
      );
      expect(mockLogger.log).toHaveBeenCalledWith('TCP role-permission revoke multiple requested', {
        roleId: 'role-123',
        permissionCount: 3,
      });
    });

    it('빈 권한 목록으로 배치 해제 요청을 처리해야 함', async () => {
      // Given
      const emptyBatchData: TcpRolePermissionBatch = {
        roleId: 'role-123',
        permissionIds: [],
      };
      rolePermissionService.revokeMultiplePermissions.mockResolvedValue(undefined);

      // When
      const result = await controller.revokeMultiplePermissions(emptyBatchData);

      // Then
      expect(result).toEqual({ success: true });
      expect(rolePermissionService.revokeMultiplePermissions).toHaveBeenCalledWith(emptyBatchData);
      expect(mockLogger.log).toHaveBeenCalledWith('TCP role-permission revoke multiple requested', {
        roleId: 'role-123',
        permissionCount: 0,
      });
    });

    it('TCP 여러 권한 해제 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = RolePermissionException.revokeMultipleError();
      rolePermissionService.revokeMultiplePermissions.mockRejectedValue(error);

      // When & Then
      await expect(
        controller.revokeMultiplePermissions(mockTcpRolePermissionBatch)
      ).rejects.toThrow(RolePermissionException.revokeMultipleError());
      expect(mockLogger.error).toHaveBeenCalledWith('TCP role-permission revoke multiple failed', {
        error: expect.any(String),
        roleId: 'role-123',
        permissionCount: 3,
      });
    });
  });

  describe('replaceRolePermissions', () => {
    it('TCP 역할 권한 교체 요청을 처리해야 함', async () => {
      // Given
      rolePermissionService.replaceRolePermissions.mockResolvedValue(undefined);

      // When
      const result = await controller.replaceRolePermissions(mockTcpRolePermissionBatch);

      // Then
      expect(result).toEqual({ success: true });
      expect(rolePermissionService.replaceRolePermissions).toHaveBeenCalledWith(
        mockTcpRolePermissionBatch
      );
      expect(mockLogger.log).toHaveBeenCalledWith('TCP role-permission replace requested', {
        roleId: 'role-123',
        newPermissionCount: 3,
      });
    });

    it('빈 권한 목록으로 권한 교체 요청을 처리해야 함 (모든 권한 제거)', async () => {
      // Given
      const emptyBatchData: TcpRolePermissionBatch = {
        roleId: 'role-123',
        permissionIds: [],
      };
      rolePermissionService.replaceRolePermissions.mockResolvedValue(undefined);

      // When
      const result = await controller.replaceRolePermissions(emptyBatchData);

      // Then
      expect(result).toEqual({ success: true });
      expect(rolePermissionService.replaceRolePermissions).toHaveBeenCalledWith(emptyBatchData);
      expect(mockLogger.log).toHaveBeenCalledWith('TCP role-permission replace requested', {
        roleId: 'role-123',
        newPermissionCount: 0,
      });
    });

    it('TCP 역할 권한 교체 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = RolePermissionException.replaceError();
      rolePermissionService.replaceRolePermissions.mockRejectedValue(error);

      // When & Then
      await expect(controller.replaceRolePermissions(mockTcpRolePermissionBatch)).rejects.toThrow(
        RolePermissionException.replaceError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP role-permission replace failed', {
        error: expect.any(String),
        roleId: 'role-123',
        newPermissionCount: 3,
      });
    });
  });

  it('TCP 컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });
});
