import { Test, TestingModule } from '@nestjs/testing';

import { AccessTokenGuard } from '@krgeobuk/jwt/guards';

import { UserRoleParamsDto } from '@krgeobuk/shared/user-role/dtos';
import { UserIdParamsDto } from '@krgeobuk/shared/user/dtos';
import { RoleIdParamsDto } from '@krgeobuk/shared/role/dtos';
import { RoleIdsDto } from '@krgeobuk/user-role/dtos';
import type { UserRoleBatchAssignmentResult } from '@krgeobuk/user-role/interfaces';
import { UserRoleException } from '@krgeobuk/user-role/exception';

import { UserRoleController } from './user-role.controller.js';
import { UserRoleService } from './user-role.service.js';

describe('UserRoleController', () => {
  let controller: UserRoleController;
  let userRoleService: jest.Mocked<UserRoleService>;

  // 테스트 데이터
  const mockUserIdParams: UserIdParamsDto = {
    userId: 'user-123',
  };

  const mockRoleIdParams: RoleIdParamsDto = {
    roleId: 'role-456',
  };

  const mockUserRoleParams: UserRoleParamsDto = {
    userId: 'user-123',
    roleId: 'role-456',
  };

  const mockRoleIdsDto: RoleIdsDto = {
    roleIds: ['role-1', 'role-2', 'role-3'],
  };

  const mockUserRoleBatchResult: UserRoleBatchAssignmentResult = {
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
      assignUserRole: jest.fn(),
      revokeUserRole: jest.fn(),
      assignMultipleRoles: jest.fn(),
      revokeMultipleRoles: jest.fn(),
      replaceUserRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserRoleController],
      providers: [
        {
          provide: UserRoleService,
          useValue: mockUserRoleService,
        },
      ],
    })
    .overrideGuard(AccessTokenGuard)
    .useValue({
      canActivate: jest.fn().mockReturnValue(true),
    })
    .compile();

    controller = module.get<UserRoleController>(UserRoleController);
    userRoleService = module.get(UserRoleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRoleIdsByUserId', () => {
    it('사용자의 역할 ID 목록을 조회해야 함', async () => {
      // Given
      const roleIds = ['role-1', 'role-2', 'role-3'];
      userRoleService.getRoleIds.mockResolvedValue(roleIds);

      // When
      const result = await controller.getRoleIdsByUserId(mockUserIdParams);

      // Then
      expect(result).toEqual(roleIds);
      expect(userRoleService.getRoleIds).toHaveBeenCalledWith('user-123');
    });

    it('사용자가 역할이 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      userRoleService.getRoleIds.mockResolvedValue([]);

      // When
      const result = await controller.getRoleIdsByUserId(mockUserIdParams);

      // Then
      expect(result).toEqual([]);
      expect(userRoleService.getRoleIds).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getUserIdsByRoleId', () => {
    it('역할의 사용자 ID 목록을 조회해야 함', async () => {
      // Given
      const userIds = ['user-1', 'user-2', 'user-3'];
      userRoleService.getUserIds.mockResolvedValue(userIds);

      // When
      const result = await controller.getUserIdsByRoleId(mockRoleIdParams);

      // Then
      expect(result).toEqual(userIds);
      expect(userRoleService.getUserIds).toHaveBeenCalledWith('role-456');
    });

    it('역할에 사용자가 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      userRoleService.getUserIds.mockResolvedValue([]);

      // When
      const result = await controller.getUserIdsByRoleId(mockRoleIdParams);

      // Then
      expect(result).toEqual([]);
      expect(userRoleService.getUserIds).toHaveBeenCalledWith('role-456');
    });
  });

  describe('checkUserRoleExists', () => {
    it('사용자-역할 관계가 존재하면 true를 반환해야 함', async () => {
      // Given
      userRoleService.exists.mockResolvedValue(true);

      // When
      const result = await controller.checkUserRoleExists(mockUserRoleParams);

      // Then
      expect(result).toBe(true);
      expect(userRoleService.exists).toHaveBeenCalledWith(mockUserRoleParams);
    });

    it('사용자-역할 관계가 존재하지 않으면 false를 반환해야 함', async () => {
      // Given
      userRoleService.exists.mockResolvedValue(false);

      // When
      const result = await controller.checkUserRoleExists(mockUserRoleParams);

      // Then
      expect(result).toBe(false);
      expect(userRoleService.exists).toHaveBeenCalledWith(mockUserRoleParams);
    });
  });

  describe('assignUserRole', () => {
    it('사용자-역할을 성공적으로 할당해야 함', async () => {
      // Given
      userRoleService.assignUserRole.mockResolvedValue(undefined);

      // When
      await controller.assignUserRole(mockUserRoleParams);

      // Then
      expect(userRoleService.assignUserRole).toHaveBeenCalledWith(mockUserRoleParams);
    });

    it('사용자-역할 할당 실패 시 에러를 전파해야 함', async () => {
      // Given
      const error = UserRoleException.assignError();
      userRoleService.assignUserRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.assignUserRole(mockUserRoleParams)).rejects.toThrow(
        UserRoleException.assignError()
      );
      expect(userRoleService.assignUserRole).toHaveBeenCalledWith(mockUserRoleParams);
    });
  });

  describe('revokeUserRole', () => {
    it('사용자-역할을 성공적으로 해제해야 함', async () => {
      // Given
      userRoleService.revokeUserRole.mockResolvedValue(undefined);

      // When
      await controller.revokeUserRole(mockUserRoleParams);

      // Then
      expect(userRoleService.revokeUserRole).toHaveBeenCalledWith(mockUserRoleParams);
    });

    it('사용자-역할 해제 실패 시 에러를 전파해야 함', async () => {
      // Given
      const error = UserRoleException.revokeError();
      userRoleService.revokeUserRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.revokeUserRole(mockUserRoleParams)).rejects.toThrow(
        UserRoleException.revokeError()
      );
      expect(userRoleService.revokeUserRole).toHaveBeenCalledWith(mockUserRoleParams);
    });
  });

  describe('assignMultipleRoles', () => {
    it('여러 역할을 성공적으로 할당해야 함', async () => {
      // Given
      userRoleService.assignMultipleRoles.mockResolvedValue(mockUserRoleBatchResult);

      // When
      await controller.assignMultipleRoles(mockUserIdParams, mockRoleIdsDto);

      // Then
      expect(userRoleService.assignMultipleRoles).toHaveBeenCalledWith({
        userId: 'user-123',
        roleIds: ['role-1', 'role-2', 'role-3'],
      });
    });

    it('빈 역할 목록으로 배치 할당 요청해도 처리해야 함', async () => {
      // Given
      const emptyRoleIdsDto: RoleIdsDto = { roleIds: [] };
      userRoleService.assignMultipleRoles.mockResolvedValue(mockUserRoleBatchResult);

      // When
      await controller.assignMultipleRoles(mockUserIdParams, emptyRoleIdsDto);

      // Then
      expect(userRoleService.assignMultipleRoles).toHaveBeenCalledWith({
        userId: 'user-123',
        roleIds: [],
      });
    });

    it('여러 역할 할당 실패 시 에러를 전파해야 함', async () => {
      // Given
      const error = UserRoleException.assignMultipleError();
      userRoleService.assignMultipleRoles.mockRejectedValue(error);

      // When & Then
      await expect(
        controller.assignMultipleRoles(mockUserIdParams, mockRoleIdsDto)
      ).rejects.toThrow(UserRoleException.assignMultipleError());
      expect(userRoleService.assignMultipleRoles).toHaveBeenCalledWith({
        userId: 'user-123',
        roleIds: ['role-1', 'role-2', 'role-3'],
      });
    });
  });

  describe('revokeMultipleRoles', () => {
    it('여러 역할을 성공적으로 해제해야 함', async () => {
      // Given
      userRoleService.revokeMultipleRoles.mockResolvedValue(undefined);

      // When
      await controller.revokeMultipleRoles(mockUserIdParams, mockRoleIdsDto);

      // Then
      expect(userRoleService.revokeMultipleRoles).toHaveBeenCalledWith({
        userId: 'user-123',
        roleIds: ['role-1', 'role-2', 'role-3'],
      });
    });

    it('여러 역할 해제 실패 시 에러를 전파해야 함', async () => {
      // Given
      const error = UserRoleException.revokeMultipleError();
      userRoleService.revokeMultipleRoles.mockRejectedValue(error);

      // When & Then
      await expect(
        controller.revokeMultipleRoles(mockUserIdParams, mockRoleIdsDto)
      ).rejects.toThrow(UserRoleException.revokeMultipleError());
      expect(userRoleService.revokeMultipleRoles).toHaveBeenCalledWith({
        userId: 'user-123',
        roleIds: ['role-1', 'role-2', 'role-3'],
      });
    });
  });

  describe('replaceUserRoles', () => {
    it('사용자 역할을 성공적으로 교체해야 함', async () => {
      // Given
      userRoleService.replaceUserRoles.mockResolvedValue(undefined);

      // When
      await controller.replaceUserRoles(mockUserIdParams, mockRoleIdsDto);

      // Then
      expect(userRoleService.replaceUserRoles).toHaveBeenCalledWith({
        userId: 'user-123',
        roleIds: ['role-1', 'role-2', 'role-3'],
      });
    });

    it('빈 역할 목록으로 역할 교체해야 함 (모든 역할 제거)', async () => {
      // Given
      const emptyRoleIdsDto: RoleIdsDto = { roleIds: [] };
      userRoleService.replaceUserRoles.mockResolvedValue(undefined);

      // When
      await controller.replaceUserRoles(mockUserIdParams, emptyRoleIdsDto);

      // Then
      expect(userRoleService.replaceUserRoles).toHaveBeenCalledWith({
        userId: 'user-123',
        roleIds: [],
      });
    });

    it('역할 교체 실패 시 에러를 전파해야 함', async () => {
      // Given
      const error = UserRoleException.replaceError();
      userRoleService.replaceUserRoles.mockRejectedValue(error);

      // When & Then
      await expect(
        controller.replaceUserRoles(mockUserIdParams, mockRoleIdsDto)
      ).rejects.toThrow(UserRoleException.replaceError());
      expect(userRoleService.replaceUserRoles).toHaveBeenCalledWith({
        userId: 'user-123',
        roleIds: ['role-1', 'role-2', 'role-3'],
      });
    });
  });

  it('컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });
});

