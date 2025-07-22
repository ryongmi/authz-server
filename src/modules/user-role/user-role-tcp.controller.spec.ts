import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import type { TcpUserId } from '@krgeobuk/user/tcp/interfaces';
import type { TcpRoleId } from '@krgeobuk/role/tcp/interfaces';
import type { TcpUserRole, TcpUserRoleBatch } from '@krgeobuk/user-role/tcp/interfaces';
import type { UserRoleBatchAssignmentResult } from '@krgeobuk/user-role/interfaces';

import { UserRoleTcpController } from './user-role-tcp.controller.js';
import { UserRoleService } from './user-role.service.js';

describe('UserRoleTcpController', () => {
  let controller: UserRoleTcpController;
  let userRoleService: jest.Mocked<UserRoleService>;
  let mockLogger: jest.Mocked<Logger>;

  // 테스트 데이터
  const mockTcpUserId: TcpUserId = {
    userId: 'user-123',
  };

  const mockTcpRoleId: TcpRoleId = {
    roleId: 'role-456',
  };

  const mockTcpUserRole: TcpUserRole = {
    userId: 'user-123',
    roleId: 'role-456',
  };

  const mockTcpUserRoleBatch: TcpUserRoleBatch = {
    userId: 'user-123',
    roleIds: ['role-1', 'role-2', 'role-3'],
  };

  const mockBatchAssignmentResult: UserRoleBatchAssignmentResult = {
    success: true,
    affected: 2,
    details: {
      assigned: 2,
      skipped: 1,
      duplicates: ['role-1'],
      newAssignments: ['role-2', 'role-3'],
      userId: 'user-123',
      assignedRoles: ['role-2', 'role-3'],
    },
  };

  beforeEach(async () => {
    const mockUserRoleService = {
      getRoleIds: jest.fn(),
      getUserIds: jest.fn(),
      exists: jest.fn(),
      assignMultipleRoles: jest.fn(),
      revokeMultipleRoles: jest.fn(),
      replaceUserRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserRoleTcpController],
      providers: [
        {
          provide: UserRoleService,
          useValue: mockUserRoleService,
        },
      ],
    }).compile();

    controller = module.get<UserRoleTcpController>(UserRoleTcpController);
    userRoleService = module.get(UserRoleService);

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

  describe('findRoleIdsByUserId', () => {
    it('TCP 사용자별 역할 ID 조회 요청을 처리해야 함', async () => {
      // Given
      const roleIds = ['role-1', 'role-2', 'role-3'];
      userRoleService.getRoleIds.mockResolvedValue(roleIds);

      // When
      const result = await controller.findRoleIdsByUserId(mockTcpUserId);

      // Then
      expect(result).toEqual(roleIds);
      expect(userRoleService.getRoleIds).toHaveBeenCalledWith('user-123');
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP user-role find roles by user requested', {
        userId: 'user-123',
      });
    });

    it('사용자에게 할당된 역할이 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      userRoleService.getRoleIds.mockResolvedValue([]);

      // When
      const result = await controller.findRoleIdsByUserId(mockTcpUserId);

      // Then
      expect(result).toEqual([]);
      expect(userRoleService.getRoleIds).toHaveBeenCalledWith('user-123');
    });

    it('TCP 사용자별 역할 조회 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = new Error('Role fetch failed');
      userRoleService.getRoleIds.mockRejectedValue(error);

      // When & Then
      await expect(controller.findRoleIdsByUserId(mockTcpUserId)).rejects.toThrow(
        'Role fetch failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP user-role find roles by user failed', {
        error: 'Role fetch failed',
        userId: 'user-123',
      });
    });
  });

  describe('findUserIdsByRoleId', () => {
    it('TCP 역할별 사용자 ID 조회 요청을 처리해야 함', async () => {
      // Given
      const userIds = ['user-1', 'user-2', 'user-3'];
      userRoleService.getUserIds.mockResolvedValue(userIds);

      // When
      const result = await controller.findUserIdsByRoleId(mockTcpRoleId);

      // Then
      expect(result).toEqual(userIds);
      expect(userRoleService.getUserIds).toHaveBeenCalledWith('role-456');
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP user-role find users by role requested', {
        roleId: 'role-456',
      });
    });

    it('역할에 할당된 사용자가 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      userRoleService.getUserIds.mockResolvedValue([]);

      // When
      const result = await controller.findUserIdsByRoleId(mockTcpRoleId);

      // Then
      expect(result).toEqual([]);
      expect(userRoleService.getUserIds).toHaveBeenCalledWith('role-456');
    });

    it('TCP 역할별 사용자 조회 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = new Error('User fetch failed');
      userRoleService.getUserIds.mockRejectedValue(error);

      // When & Then
      await expect(controller.findUserIdsByRoleId(mockTcpRoleId)).rejects.toThrow(
        'User fetch failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP user-role find users by role failed', {
        error: 'User fetch failed',
        roleId: 'role-456',
      });
    });
  });

  describe('existsUserRole', () => {
    it('TCP 사용자-역할 관계 존재 확인 요청을 처리해야 함', async () => {
      // Given
      userRoleService.exists.mockResolvedValue(true);

      // When
      const result = await controller.existsUserRole(mockTcpUserRole);

      // Then
      expect(result).toBe(true);
      expect(userRoleService.exists).toHaveBeenCalledWith(mockTcpUserRole);
      expect(mockLogger.debug).toHaveBeenCalledWith('TCP user-role exists check requested', {
        userId: 'user-123',
        roleId: 'role-456',
      });
    });

    it('사용자-역할 관계가 존재하지 않으면 false를 반환해야 함', async () => {
      // Given
      userRoleService.exists.mockResolvedValue(false);

      // When
      const result = await controller.existsUserRole(mockTcpUserRole);

      // Then
      expect(result).toBe(false);
      expect(userRoleService.exists).toHaveBeenCalledWith(mockTcpUserRole);
    });

    it('TCP 사용자-역할 존재 확인 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = new Error('Existence check failed');
      userRoleService.exists.mockRejectedValue(error);

      // When & Then
      await expect(controller.existsUserRole(mockTcpUserRole)).rejects.toThrow(
        'Existence check failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP user-role exists check failed', {
        error: 'Existence check failed',
        userId: 'user-123',
        roleId: 'role-456',
      });
    });
  });

  describe('assignMultipleRoles', () => {
    it('TCP 여러 역할 할당 요청을 처리해야 함', async () => {
      // Given
      userRoleService.assignMultipleRoles.mockResolvedValue(mockBatchAssignmentResult);

      // When
      const result = await controller.assignMultipleRoles(mockTcpUserRoleBatch);

      // Then
      expect(result).toEqual({ success: true });
      expect(userRoleService.assignMultipleRoles).toHaveBeenCalledWith(mockTcpUserRoleBatch);
      expect(mockLogger.log).toHaveBeenCalledWith('TCP user-role assign multiple requested', {
        userId: 'user-123',
        roleCount: 3,
      });
    });

    it('빈 역할 목록으로 배치 할당 요청을 처리해야 함', async () => {
      // Given
      const emptyBatchData: TcpUserRoleBatch = {
        userId: 'user-123',
        roleIds: [],
      };
      const emptyResult: UserRoleBatchAssignmentResult = {
        success: true,
        affected: 0,
        details: {
          assigned: 0,
          skipped: 0,
          duplicates: [],
          newAssignments: [],
          userId: 'user-123',
          assignedRoles: [],
        },
      };
      userRoleService.assignMultipleRoles.mockResolvedValue(emptyResult);

      // When
      const result = await controller.assignMultipleRoles(emptyBatchData);

      // Then
      expect(result).toEqual({ success: true });
      expect(userRoleService.assignMultipleRoles).toHaveBeenCalledWith(emptyBatchData);
      expect(mockLogger.log).toHaveBeenCalledWith('TCP user-role assign multiple requested', {
        userId: 'user-123',
        roleCount: 0,
      });
    });

    it('TCP 여러 역할 할당 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = new Error('Multiple assignment failed');
      userRoleService.assignMultipleRoles.mockRejectedValue(error);

      // When & Then
      await expect(controller.assignMultipleRoles(mockTcpUserRoleBatch)).rejects.toThrow(
        'Multiple assignment failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP user-role assign multiple failed', {
        error: 'Multiple assignment failed',
        userId: 'user-123',
        roleCount: 3,
      });
    });
  });

  describe('revokeMultipleRoles', () => {
    it('TCP 여러 역할 해제 요청을 처리해야 함', async () => {
      // Given
      userRoleService.revokeMultipleRoles.mockResolvedValue(undefined);

      // When
      const result = await controller.revokeMultipleRoles(mockTcpUserRoleBatch);

      // Then
      expect(result).toEqual({ success: true });
      expect(userRoleService.revokeMultipleRoles).toHaveBeenCalledWith(mockTcpUserRoleBatch);
      expect(mockLogger.log).toHaveBeenCalledWith('TCP user-role revoke multiple requested', {
        userId: 'user-123',
        roleCount: 3,
      });
    });

    it('빈 역할 목록으로 배치 해제 요청을 처리해야 함', async () => {
      // Given
      const emptyBatchData: TcpUserRoleBatch = {
        userId: 'user-123',
        roleIds: [],
      };
      userRoleService.revokeMultipleRoles.mockResolvedValue(undefined);

      // When
      const result = await controller.revokeMultipleRoles(emptyBatchData);

      // Then
      expect(result).toEqual({ success: true });
      expect(userRoleService.revokeMultipleRoles).toHaveBeenCalledWith(emptyBatchData);
      expect(mockLogger.log).toHaveBeenCalledWith('TCP user-role revoke multiple requested', {
        userId: 'user-123',
        roleCount: 0,
      });
    });

    it('TCP 여러 역할 해제 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = new Error('Multiple revocation failed');
      userRoleService.revokeMultipleRoles.mockRejectedValue(error);

      // When & Then
      await expect(controller.revokeMultipleRoles(mockTcpUserRoleBatch)).rejects.toThrow(
        'Multiple revocation failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP user-role revoke multiple failed', {
        error: 'Multiple revocation failed',
        userId: 'user-123',
        roleCount: 3,
      });
    });
  });

  describe('replaceUserRoles', () => {
    it('TCP 사용자 역할 교체 요청을 처리해야 함', async () => {
      // Given
      userRoleService.replaceUserRoles.mockResolvedValue(undefined);

      // When
      const result = await controller.replaceUserRoles(mockTcpUserRoleBatch);

      // Then
      expect(result).toEqual({ success: true });
      expect(userRoleService.replaceUserRoles).toHaveBeenCalledWith(mockTcpUserRoleBatch);
      expect(mockLogger.log).toHaveBeenCalledWith('TCP user-role replace requested', {
        userId: 'user-123',
        newRoleCount: 3,
      });
    });

    it('빈 역할 목록으로 역할 교체 요청을 처리해야 함 (모든 역할 제거)', async () => {
      // Given
      const emptyBatchData: TcpUserRoleBatch = {
        userId: 'user-123',
        roleIds: [],
      };
      userRoleService.replaceUserRoles.mockResolvedValue(undefined);

      // When
      const result = await controller.replaceUserRoles(emptyBatchData);

      // Then
      expect(result).toEqual({ success: true });
      expect(userRoleService.replaceUserRoles).toHaveBeenCalledWith(emptyBatchData);
      expect(mockLogger.log).toHaveBeenCalledWith('TCP user-role replace requested', {
        userId: 'user-123',
        newRoleCount: 0,
      });
    });

    it('TCP 사용자 역할 교체 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = new Error('Role replacement failed');
      userRoleService.replaceUserRoles.mockRejectedValue(error);

      // When & Then
      await expect(controller.replaceUserRoles(mockTcpUserRoleBatch)).rejects.toThrow(
        'Role replacement failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith('TCP user-role replace failed', {
        error: 'Role replacement failed',
        userId: 'user-123',
        newRoleCount: 3,
      });
    });
  });

  it('TCP 컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });
});
