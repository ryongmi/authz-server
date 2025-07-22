import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import { DeleteResult } from 'typeorm';

import { UserRoleException } from '@krgeobuk/user-role/exception';
import type { TcpUserRoleBatch } from '@krgeobuk/user-role/tcp';
import type { UserRoleParams } from '@krgeobuk/shared/user-role';

import { UserRoleService } from './user-role.service.js';
import { UserRoleRepository } from './user-role.repository.js';
import { UserRoleEntity } from './entities/user-role.entity.js';

describe('UserRoleService', () => {
  let service: UserRoleService;
  let userRoleRepo: jest.Mocked<UserRoleRepository>;
  let mockLogger: jest.Mocked<Logger>;

  // 테스트 데이터
  const mockUserRole: UserRoleEntity = {
    userId: 'user-123',
    roleId: 'role-456',
  };

  const mockUserRoleParams: UserRoleParams = {
    userId: 'user-123',
    roleId: 'role-456',
  };

  beforeEach(async () => {
    const mockUserRoleRepo = {
      findRoleIdsByUserId: jest.fn(),
      findUserIdsByRoleId: jest.fn(),
      findRoleIdsByUserIds: jest.fn(),
      findUserIdsByRoleIds: jest.fn(),
      existsUserRole: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
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
        UserRoleService,
        {
          provide: UserRoleRepository,
          useValue: mockUserRoleRepo,
        },
      ],
    }).compile();

    service = module.get<UserRoleService>(UserRoleService);
    userRoleRepo = module.get(UserRoleRepository);

    // Logger mock 설정
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

  describe('getRoleIds', () => {
    it('사용자의 역할 ID 목록을 조회해야 함', async () => {
      // Given
      const roleIds = ['role-1', 'role-2', 'role-3'];
      userRoleRepo.findRoleIdsByUserId.mockResolvedValue(roleIds);

      // When
      const result = await service.getRoleIds('user-123');

      // Then
      expect(result).toEqual(roleIds);
      expect(userRoleRepo.findRoleIdsByUserId).toHaveBeenCalledWith('user-123');
    });

    it('조회 실패 시 UserRoleException을 던져야 함', async () => {
      // Given
      const error = new Error('Database error');
      userRoleRepo.findRoleIdsByUserId.mockRejectedValue(error);

      // When & Then
      await expect(service.getRoleIds('user-123')).rejects.toThrow(UserRoleException.fetchError());
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Role IDs fetch by user failed',
        expect.any(Object)
      );
    });
  });

  describe('getUserIds', () => {
    it('역할의 사용자 ID 목록을 조회해야 함', async () => {
      // Given
      const userIds = ['user-1', 'user-2', 'user-3'];
      userRoleRepo.findUserIdsByRoleId.mockResolvedValue(userIds);

      // When
      const result = await service.getUserIds('role-456');

      // Then
      expect(result).toEqual(userIds);
      expect(userRoleRepo.findUserIdsByRoleId).toHaveBeenCalledWith('role-456');
    });

    it('조회 실패 시 UserRoleException을 던져야 함', async () => {
      // Given
      const error = new Error('Database error');
      userRoleRepo.findUserIdsByRoleId.mockRejectedValue(error);

      // When & Then
      await expect(service.getUserIds('role-456')).rejects.toThrow(UserRoleException.fetchError());
      expect(mockLogger.error).toHaveBeenCalledWith(
        'User IDs fetch by role failed',
        expect.any(Object)
      );
    });
  });

  describe('exists', () => {
    it('사용자-역할 관계가 존재하면 true를 반환해야 함', async () => {
      // Given
      userRoleRepo.existsUserRole.mockResolvedValue(true);

      // When
      const result = await service.exists(mockUserRoleParams);

      // Then
      expect(result).toBe(true);
      expect(userRoleRepo.existsUserRole).toHaveBeenCalledWith('user-123', 'role-456');
    });

    it('사용자-역할 관계가 존재하지 않으면 false를 반환해야 함', async () => {
      // Given
      userRoleRepo.existsUserRole.mockResolvedValue(false);

      // When
      const result = await service.exists(mockUserRoleParams);

      // Then
      expect(result).toBe(false);
      expect(userRoleRepo.existsUserRole).toHaveBeenCalledWith('user-123', 'role-456');
    });

    it('확인 실패 시 UserRoleException을 던져야 함', async () => {
      // Given
      const error = new Error('Database error');
      userRoleRepo.existsUserRole.mockRejectedValue(error);

      // When & Then
      await expect(service.exists(mockUserRoleParams)).rejects.toThrow(
        UserRoleException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'User role existence check failed',
        expect.any(Object)
      );
    });
  });

  describe('getRoleIdsBatch', () => {
    it('여러 사용자의 역할 ID 목록을 배치로 조회해야 함', async () => {
      // Given
      const userIds = ['user-1', 'user-2'];
      const roleIdsMap = {
        'user-1': ['role-1', 'role-2'],
        'user-2': ['role-2', 'role-3'],
      };
      userRoleRepo.findRoleIdsByUserIds.mockResolvedValue(roleIdsMap);

      // When
      const result = await service.getRoleIdsBatch(userIds);

      // Then
      expect(result).toEqual(roleIdsMap);
      expect(userRoleRepo.findRoleIdsByUserIds).toHaveBeenCalledWith(userIds);
    });

    it('배치 조회 실패 시 UserRoleException을 던져야 함', async () => {
      // Given
      const error = new Error('Database error');
      userRoleRepo.findRoleIdsByUserIds.mockRejectedValue(error);

      // When & Then
      await expect(service.getRoleIdsBatch(['user-1'])).rejects.toThrow(
        UserRoleException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Role IDs fetch by users failed',
        expect.any(Object)
      );
    });
  });

  describe('getUserIdsBatch', () => {
    it('여러 역할의 사용자 ID 목록을 배치로 조회해야 함', async () => {
      // Given
      const roleIds = ['role-1', 'role-2'];
      const userIdsMap = {
        'role-1': ['user-1', 'user-2'],
        'role-2': ['user-2', 'user-3'],
      };
      userRoleRepo.findUserIdsByRoleIds.mockResolvedValue(userIdsMap);

      // When
      const result = await service.getUserIdsBatch(roleIds);

      // Then
      expect(result).toEqual(userIdsMap);
      expect(userRoleRepo.findUserIdsByRoleIds).toHaveBeenCalledWith(roleIds);
    });

    it('배치 조회 실패 시 UserRoleException을 던져야 함', async () => {
      // Given
      const error = new Error('Database error');
      userRoleRepo.findUserIdsByRoleIds.mockRejectedValue(error);

      // When & Then
      await expect(service.getUserIdsBatch(['role-1'])).rejects.toThrow(
        UserRoleException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'User IDs fetch by roles failed',
        expect.any(Object)
      );
    });
  });

  describe('getRoleCountsBatch', () => {
    it('여러 역할의 사용자 수를 배치로 조회해야 함', async () => {
      // Given
      const roleIds = ['role-1', 'role-2'];
      const userIdsMap = {
        'role-1': ['user-1', 'user-2'],
        'role-2': ['user-2', 'user-3', 'user-4'],
      };
      userRoleRepo.findUserIdsByRoleIds.mockResolvedValue(userIdsMap);

      // When
      const result = await service.getRoleCountsBatch(roleIds);

      // Then
      expect(result).toEqual({
        'role-1': 2,
        'role-2': 3,
      });
      expect(userRoleRepo.findUserIdsByRoleIds).toHaveBeenCalledWith(roleIds);
    });
  });

  describe('assignUserRole', () => {
    it('사용자-역할을 성공적으로 할당해야 함', async () => {
      // Given
      userRoleRepo.existsUserRole.mockResolvedValue(false); // 중복 없음
      userRoleRepo.save.mockResolvedValue(mockUserRole);

      // When
      await service.assignUserRole(mockUserRoleParams);

      // Then
      expect(userRoleRepo.existsUserRole).toHaveBeenCalledWith('user-123', 'role-456');
      expect(userRoleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          roleId: 'role-456',
        })
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'User role assigned successfully',
        expect.any(Object)
      );
    });

    it('이미 할당된 사용자-역할이면 UserRoleException을 던져야 함', async () => {
      // Given
      userRoleRepo.existsUserRole.mockResolvedValue(true); // 중복 존재

      // When & Then
      await expect(service.assignUserRole(mockUserRoleParams)).rejects.toThrow(
        UserRoleException.userRoleAlreadyExists()
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User role already assigned',
        expect.any(Object)
      );
      expect(userRoleRepo.save).not.toHaveBeenCalled();
    });

    it('할당 실패 시 UserRoleException을 던져야 함', async () => {
      // Given
      userRoleRepo.existsUserRole.mockResolvedValue(false);
      const error = new Error('Database error');
      userRoleRepo.save.mockRejectedValue(error);

      // When & Then
      await expect(service.assignUserRole(mockUserRoleParams)).rejects.toThrow(
        UserRoleException.assignError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'User role assignment failed',
        expect.any(Object)
      );
    });
  });

  describe('revokeUserRole', () => {
    it('사용자-역할을 성공적으로 해제해야 함', async () => {
      // Given
      const mockDeleteResult: DeleteResult = {
        affected: 1,
        raw: {},
      };
      userRoleRepo.delete.mockResolvedValue(mockDeleteResult);

      // When
      await service.revokeUserRole(mockUserRoleParams);

      // Then
      expect(userRoleRepo.delete).toHaveBeenCalledWith({
        userId: 'user-123',
        roleId: 'role-456',
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        'User role revoked successfully',
        expect.any(Object)
      );
    });

    it('해제할 사용자-역할이 없으면 UserRoleException을 던져야 함', async () => {
      // Given
      const mockDeleteResult: DeleteResult = {
        affected: 0,
        raw: {},
      };
      userRoleRepo.delete.mockResolvedValue(mockDeleteResult);

      // When & Then
      await expect(service.revokeUserRole(mockUserRoleParams)).rejects.toThrow(
        UserRoleException.userRoleNotFound()
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User role not found for revocation',
        expect.any(Object)
      );
    });

    it('해제 실패 시 UserRoleException을 던져야 함', async () => {
      // Given
      const error = new Error('Database error');
      userRoleRepo.delete.mockRejectedValue(error);

      // When & Then
      await expect(service.revokeUserRole(mockUserRoleParams)).rejects.toThrow(
        UserRoleException.revokeError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'User role revocation failed',
        expect.any(Object)
      );
    });
  });

  describe('assignMultipleRoles', () => {
    const batchDto: TcpUserRoleBatch = {
      userId: 'user-123',
      roleIds: ['role-1', 'role-2', 'role-3'],
    };

    it('여러 역할을 성공적으로 할당해야 함', async () => {
      // Given
      userRoleRepo.findRoleIdsByUserId.mockResolvedValue(['role-1']); // 기존 역할
      const newEntities: UserRoleEntity[] = [
        Object.assign(new UserRoleEntity(), { userId: 'user-123', roleId: 'role-2' }),
        Object.assign(new UserRoleEntity(), { userId: 'user-123', roleId: 'role-3' }),
      ];
      (userRoleRepo.save as jest.Mock).mockResolvedValue(newEntities);

      // When
      const result = await service.assignMultipleRoles(batchDto);

      // Then
      expect(result).toEqual({
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
      });
      expect(userRoleRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ userId: 'user-123', roleId: 'role-2' }),
          expect.objectContaining({ userId: 'user-123', roleId: 'role-3' }),
        ])
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Multiple user roles assigned successfully',
        expect.any(Object)
      );
    });

    it('모든 역할이 이미 할당된 경우 할당을 건너뛰어야 함', async () => {
      // Given
      userRoleRepo.findRoleIdsByUserId.mockResolvedValue(['role-1', 'role-2', 'role-3']); // 모든 역할이 기존에 있음

      // When
      const result = await service.assignMultipleRoles(batchDto);

      // Then
      expect(result).toEqual({
        success: true,
        affected: 0,
        details: {
          assigned: 0,
          skipped: 3,
          duplicates: ['role-1', 'role-2', 'role-3'],
          newAssignments: [],
          userId: 'user-123',
          assignedRoles: [],
        },
      });
      expect(userRoleRepo.save).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No new roles to assign - all already exist',
        expect.any(Object)
      );
    });

    it('배치 할당 실패 시 UserRoleException을 던져야 함', async () => {
      // Given
      userRoleRepo.findRoleIdsByUserId.mockResolvedValue([]);
      const error = new Error('Database error');
      userRoleRepo.save.mockRejectedValue(error);

      // When & Then
      await expect(service.assignMultipleRoles(batchDto)).rejects.toThrow(
        UserRoleException.assignMultipleError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Multiple user roles assignment failed',
        expect.any(Object)
      );
    });
  });
});

