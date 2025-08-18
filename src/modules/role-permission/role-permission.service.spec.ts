import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import type { RolePermissionParams } from '@krgeobuk/shared/role-permission';
import type { TcpRolePermissionBatch } from '@krgeobuk/role-permission/tcp';
import type { RolePermissionBatchAssignmentResult } from '@krgeobuk/role-permission/interfaces';
import { RolePermissionException } from '@krgeobuk/role-permission/exception';

import { RolePermissionRepository } from './role-permission.repository.js';
import { RolePermissionService } from './role-permission.service.js';
import { RolePermissionEntity } from './entities/role-permission.entity.js';

describe('RolePermissionService', () => {
  let service: RolePermissionService;
  let mockRolePermissionRepo: jest.Mocked<RolePermissionRepository>;
  let mockLogger: jest.Mocked<Logger>;

  // 테스트 데이터 상수
  const mockRoleId = 'role-123';
  const mockPermissionId = 'permission-456';
  const mockPermissionIds = ['permission-456', 'permission-789', 'permission-abc'];
  const mockRoleIds = ['role-123', 'role-456', 'role-789'];

  const mockRolePermissionParams: RolePermissionParams = {
    roleId: mockRoleId,
    permissionId: mockPermissionId,
  };

  const mockTcpBatchDto: TcpRolePermissionBatch = {
    roleId: mockRoleId,
    permissionIds: mockPermissionIds,
  };

  const mockRolePermissionEntity: RolePermissionEntity = {
    roleId: mockRoleId,
    permissionId: mockPermissionId,
  } as RolePermissionEntity;

  const mockDeleteResult = {
    affected: 1,
    raw: {},
    generatedMaps: [],
  };

  beforeEach(async () => {
    const mockRepo = {
      findPermissionIdsByRoleId: jest.fn(),
      findRoleIdsByPermissionId: jest.fn(),
      existsRolePermission: jest.fn(),
      findPermissionIdsByRoleIds: jest.fn(),
      findRoleIdsByPermissionIds: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      manager: {
        transaction: jest.fn(),
      },
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

    const module = await Test.createTestingModule({
      providers: [
        RolePermissionService,
        {
          provide: RolePermissionRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<RolePermissionService>(RolePermissionService);
    mockRolePermissionRepo = module.get(RolePermissionRepository);
    mockLogger = mockLoggerInstance;

    // Logger 모킹
    // Logger 프로퍼티 직접 교체
    Object.defineProperty(service, 'logger', {
      value: mockLogger,
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== 조회 메서드 테스트 ====================

  describe('getPermissionIds', () => {
    it('역할의 권한 ID 목록을 성공적으로 반환해야 함', async () => {
      // Given
      mockRolePermissionRepo.findPermissionIdsByRoleId.mockResolvedValue(mockPermissionIds);

      // When
      const result = await service.getPermissionIds(mockRoleId);

      // Then
      expect(result).toEqual(mockPermissionIds);
      expect(mockRolePermissionRepo.findPermissionIdsByRoleId).toHaveBeenCalledWith(mockRoleId);
      expect(mockRolePermissionRepo.findPermissionIdsByRoleId).toHaveBeenCalledTimes(1);
    });

    it('레포지토리 오류 시 RolePermissionException.fetchError를 던져야 함', async () => {
      // Given
      const mockError = new Error('Database error');
      mockRolePermissionRepo.findPermissionIdsByRoleId.mockRejectedValue(mockError);

      // When & Then
      await expect(service.getPermissionIds(mockRoleId)).rejects.toThrow(
        RolePermissionException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('역할별 권한 ID 조회 실패', {
        error: 'Database error',
        roleId: mockRoleId,
      });
    });
  });

  describe('getRoleIds', () => {
    it('권한의 역할 ID 목록을 성공적으로 반환해야 함', async () => {
      // Given
      mockRolePermissionRepo.findRoleIdsByPermissionId.mockResolvedValue(mockRoleIds);

      // When
      const result = await service.getRoleIds(mockPermissionId);

      // Then
      expect(result).toEqual(mockRoleIds);
      expect(mockRolePermissionRepo.findRoleIdsByPermissionId).toHaveBeenCalledWith(
        mockPermissionId
      );
      expect(mockRolePermissionRepo.findRoleIdsByPermissionId).toHaveBeenCalledTimes(1);
    });

    it('레포지토리 오류 시 RolePermissionException.fetchError를 던져야 함', async () => {
      // Given
      const mockError = new Error('Database connection failed');
      mockRolePermissionRepo.findRoleIdsByPermissionId.mockRejectedValue(mockError);

      // When & Then
      await expect(service.getRoleIds(mockPermissionId)).rejects.toThrow(
        RolePermissionException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('권한별 역할 ID 조회 실패', {
        error: 'Database connection failed',
        permissionId: mockPermissionId,
      });
    });
  });

  describe('exists', () => {
    it('역할-권한 관계가 존재할 때 true를 반환해야 함', async () => {
      // Given
      mockRolePermissionRepo.existsRolePermission.mockResolvedValue(true);

      // When
      const result = await service.exists(mockRolePermissionParams);

      // Then
      expect(result).toBe(true);
      expect(mockRolePermissionRepo.existsRolePermission).toHaveBeenCalledWith(
        mockRoleId,
        mockPermissionId
      );
    });

    it('역할-권한 관계가 존재하지 않을 때 false를 반환해야 함', async () => {
      // Given
      mockRolePermissionRepo.existsRolePermission.mockResolvedValue(false);

      // When
      const result = await service.exists(mockRolePermissionParams);

      // Then
      expect(result).toBe(false);
      expect(mockRolePermissionRepo.existsRolePermission).toHaveBeenCalledWith(
        mockRoleId,
        mockPermissionId
      );
    });

    it('레포지토리 오류 시 RolePermissionException.fetchError를 던져야 함', async () => {
      // Given
      const mockError = new Error('Connection timeout');
      mockRolePermissionRepo.existsRolePermission.mockRejectedValue(mockError);

      // When & Then
      await expect(service.exists(mockRolePermissionParams)).rejects.toThrow(
        RolePermissionException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('역할-권한 관계 존재 확인 실패', {
        error: 'Connection timeout',
        roleId: mockRoleId,
        permissionId: mockPermissionId,
      });
    });
  });

  describe('getPermissionIdsBatch', () => {
    it('여러 역할의 권한 ID 배치를 성공적으로 반환해야 함', async () => {
      // Given
      const mockBatchResult: Record<string, string[]> = {
        'role-123': ['permission-1', 'permission-2'],
        'role-456': ['permission-3'],
        'role-789': [],
      };
      mockRolePermissionRepo.findPermissionIdsByRoleIds.mockResolvedValue(mockBatchResult);

      // When
      const result = await service.getPermissionIdsBatch(mockRoleIds);

      // Then
      expect(result).toEqual(mockBatchResult);
      expect(mockRolePermissionRepo.findPermissionIdsByRoleIds).toHaveBeenCalledWith(mockRoleIds);
    });

    it('레포지토리 오류 시 RolePermissionException.fetchError를 던져야 함', async () => {
      // Given
      const mockError = new Error('Batch query failed');
      mockRolePermissionRepo.findPermissionIdsByRoleIds.mockRejectedValue(mockError);

      // When & Then
      await expect(service.getPermissionIdsBatch(mockRoleIds)).rejects.toThrow(
        RolePermissionException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('역할별 권한 ID 배치 조회 실패', {
        error: 'Batch query failed',
        roleCount: mockRoleIds.length,
      });
    });
  });

  describe('getRoleIdsBatch', () => {
    it('여러 권한의 역할 ID 배치를 성공적으로 반환해야 함', async () => {
      // Given
      const mockBatchResult: Record<string, string[]> = {
        'permission-456': ['role-1', 'role-2'],
        'permission-789': ['role-3'],
        'permission-abc': [],
      };
      mockRolePermissionRepo.findRoleIdsByPermissionIds.mockResolvedValue(mockBatchResult);

      // When
      const result = await service.getRoleIdsBatch(mockPermissionIds);

      // Then
      expect(result).toEqual(mockBatchResult);
      expect(mockRolePermissionRepo.findRoleIdsByPermissionIds).toHaveBeenCalledWith(
        mockPermissionIds
      );
    });

    it('레포지토리 오류 시 RolePermissionException.fetchError를 던져야 함', async () => {
      // Given
      const mockError = new Error('Permission batch failed');
      mockRolePermissionRepo.findRoleIdsByPermissionIds.mockRejectedValue(mockError);

      // When & Then
      await expect(service.getRoleIdsBatch(mockPermissionIds)).rejects.toThrow(
        RolePermissionException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('권한별 역할 ID 배치 조회 실패', {
        error: 'Permission batch failed',
        permissionCount: mockPermissionIds.length,
      });
    });
  });

  describe('getRoleCountsBatch', () => {
    it('여러 권한의 역할 수를 성공적으로 계산하여 반환해야 함', async () => {
      // Given
      const mockRoleIdsMap: Record<string, string[]> = {
        'permission-456': ['role-1', 'role-2'],
        'permission-789': ['role-3'],
        'permission-abc': [],
      };
      const expectedCounts: Record<string, number> = {
        'permission-456': 2,
        'permission-789': 1,
        'permission-abc': 0,
      };
      mockRolePermissionRepo.findRoleIdsByPermissionIds.mockResolvedValue(mockRoleIdsMap);

      // When
      const result = await service.getRoleCountsBatch(mockPermissionIds);

      // Then
      expect(result).toEqual(expectedCounts);
      expect(mockRolePermissionRepo.findRoleIdsByPermissionIds).toHaveBeenCalledWith(
        mockPermissionIds
      );
    });

    it('레포지토리 오류 시 RolePermissionException.fetchError를 던져야 함', async () => {
      // Given
      const mockError = new Error('Role count batch failed');
      mockRolePermissionRepo.findRoleIdsByPermissionIds.mockRejectedValue(mockError);

      // When & Then
      await expect(service.getRoleCountsBatch(mockPermissionIds)).rejects.toThrow(
        RolePermissionException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('권한별 역할 수 조회 실패', {
        error: 'Role count batch failed',
        permissionCount: mockPermissionIds.length,
      });
    });
  });

  // ==================== 변경 메서드 테스트 ====================

  describe('assignRolePermission', () => {
    it('역할-권한을 성공적으로 할당해야 함', async () => {
      // Given
      mockRolePermissionRepo.existsRolePermission.mockResolvedValue(false); // 중복 없음
      mockRolePermissionRepo.save.mockResolvedValue(mockRolePermissionEntity);

      // When
      await service.assignRolePermission(mockRolePermissionParams);

      // Then
      expect(mockRolePermissionRepo.existsRolePermission).toHaveBeenCalledWith(
        mockRoleId,
        mockPermissionId
      );
      expect(mockRolePermissionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          roleId: mockRoleId,
          permissionId: mockPermissionId,
        })
      );
      expect(mockLogger.log).toHaveBeenCalledWith('역할-권한 할당 성공', {
        roleId: mockRoleId,
        permissionId: mockPermissionId,
      });
    });

    it('이미 존재하는 역할-권한 관계일 때 rolePermissionAlreadyExists 예외를 던져야 함', async () => {
      // Given
      mockRolePermissionRepo.existsRolePermission.mockResolvedValue(true); // 중복 존재

      // When & Then
      await expect(service.assignRolePermission(mockRolePermissionParams)).rejects.toThrow(
        RolePermissionException.rolePermissionAlreadyExists()
      );
      expect(mockLogger.warn).toHaveBeenCalledWith('역할-권한 관계 이미 존재', {
        roleId: mockRoleId,
        permissionId: mockPermissionId,
      });
      expect(mockRolePermissionRepo.save).not.toHaveBeenCalled();
    });

    it('레포지토리 오류 시 assignError 예외를 던져야 함', async () => {
      // Given
      mockRolePermissionRepo.existsRolePermission.mockResolvedValue(false);
      const mockError = new Error('Save failed');
      mockRolePermissionRepo.save.mockRejectedValue(mockError);

      // When & Then
      await expect(service.assignRolePermission(mockRolePermissionParams)).rejects.toThrow(
        RolePermissionException.assignError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('역할-권한 할당 실패', {
        error: 'Save failed',
        roleId: mockRoleId,
        permissionId: mockPermissionId,
      });
    });
  });

  describe('revokeRolePermission', () => {
    it('역할-권한을 성공적으로 해제해야 함', async () => {
      // Given
      mockRolePermissionRepo.delete.mockResolvedValue(mockDeleteResult);

      // When
      await service.revokeRolePermission(mockRolePermissionParams);

      // Then
      expect(mockRolePermissionRepo.delete).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionId: mockPermissionId,
      });
      expect(mockLogger.log).toHaveBeenCalledWith('역할-권한 해제 성공', {
        roleId: mockRoleId,
        permissionId: mockPermissionId,
      });
    });

    it('존재하지 않는 역할-권한 관계일 때 rolePermissionNotFound 예외를 던져야 함', async () => {
      // Given
      const mockDeleteResultNotFound = { affected: 0, raw: {}, generatedMaps: [] };
      mockRolePermissionRepo.delete.mockResolvedValue(mockDeleteResultNotFound);

      // When & Then
      await expect(service.revokeRolePermission(mockRolePermissionParams)).rejects.toThrow(
        RolePermissionException.rolePermissionNotFound()
      );
      expect(mockLogger.warn).toHaveBeenCalledWith('해제할 역할-권한 관계를 찾을 수 없음', {
        roleId: mockRoleId,
        permissionId: mockPermissionId,
      });
    });

    it('레포지토리 오류 시 revokeError 예외를 던져야 함', async () => {
      // Given
      const mockError = new Error('Delete failed');
      mockRolePermissionRepo.delete.mockRejectedValue(mockError);

      // When & Then
      await expect(service.revokeRolePermission(mockRolePermissionParams)).rejects.toThrow(
        RolePermissionException.revokeError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('역할-권한 해제 실패', {
        error: 'Delete failed',
        roleId: mockRoleId,
        permissionId: mockPermissionId,
      });
    });
  });

  // ==================== 배치 처리 메서드 테스트 ====================

  describe('assignMultiplePermissions', () => {
    it('여러 권한을 성공적으로 할당해야 함', async () => {
      // Given - 일부 중복, 일부 신규
      const existingPermissions = ['permission-456']; // 기존 권한
      const expectedNewPermissions = ['permission-789', 'permission-abc']; // 신규 권한
      const expectedDuplicates = ['permission-456'];

      const mockSavedEntities = expectedNewPermissions.map(
        (permissionId) =>
          ({
            roleId: mockRoleId,
            permissionId,
          }) as RolePermissionEntity
      );

      mockRolePermissionRepo.findPermissionIdsByRoleId.mockResolvedValue(existingPermissions);
      mockRolePermissionRepo.save.mockResolvedValue(mockSavedEntities[0] as RolePermissionEntity);

      const expectedResult: RolePermissionBatchAssignmentResult = {
        success: true,
        affected: 2,
        details: {
          assigned: 2,
          skipped: 1,
          duplicates: expectedDuplicates,
          newAssignments: expectedNewPermissions,
          roleId: mockRoleId,
          assignedPermissions: expectedNewPermissions,
        },
      };

      // When
      const result = await service.assignMultiplePermissions(mockTcpBatchDto);

      // Then
      expect(result).toEqual(expectedResult);
      expect(mockRolePermissionRepo.findPermissionIdsByRoleId).toHaveBeenCalledWith(mockRoleId);
      expect(mockRolePermissionRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ roleId: mockRoleId, permissionId: 'permission-789' }),
          expect.objectContaining({ roleId: mockRoleId, permissionId: 'permission-abc' }),
        ])
      );
      expect(mockLogger.log).toHaveBeenCalledWith('역할 다중 권한 할당 성공', {
        roleId: mockRoleId,
        assignedCount: 2,
        skippedCount: 1,
        totalRequested: 3,
      });
    });

    it('모든 권한이 이미 할당된 경우 할당 없이 결과를 반환해야 함', async () => {
      // Given - 모든 권한이 기존에 존재
      mockRolePermissionRepo.findPermissionIdsByRoleId.mockResolvedValue(mockPermissionIds);

      const expectedResult: RolePermissionBatchAssignmentResult = {
        success: true,
        affected: 0,
        details: {
          assigned: 0,
          skipped: 3,
          duplicates: mockPermissionIds,
          newAssignments: [],
          roleId: mockRoleId,
          assignedPermissions: [],
        },
      };

      // When
      const result = await service.assignMultiplePermissions(mockTcpBatchDto);

      // Then
      expect(result).toEqual(expectedResult);
      expect(mockRolePermissionRepo.save).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '새로운 권한 할당 없음 - 모든 권한이 이미 존재',
        {
          roleId: mockRoleId,
          requestedCount: 3,
          duplicateCount: 3,
        }
      );
    });

    it('레포지토리 오류 시 assignMultipleError 예외를 던져야 함', async () => {
      // Given
      const mockError = new Error('Batch assignment failed');
      mockRolePermissionRepo.findPermissionIdsByRoleId.mockRejectedValue(mockError);

      // When & Then
      await expect(service.assignMultiplePermissions(mockTcpBatchDto)).rejects.toThrow(
        RolePermissionException.assignMultipleError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('역할 다중 권한 할당 실패', {
        error: '역할-권한 관계 조회 중 서버 오류가 발생했습니다.',
        roleId: mockRoleId,
        permissionCount: mockPermissionIds.length,
      });
    });
  });

  describe('revokeMultiplePermissions', () => {
    it('여러 권한을 성공적으로 해제해야 함', async () => {
      // Given
      mockRolePermissionRepo.delete.mockResolvedValue(mockDeleteResult);

      // When
      await service.revokeMultiplePermissions(mockTcpBatchDto);

      // Then
      expect(mockRolePermissionRepo.delete).toHaveBeenCalledWith({
        roleId: mockRoleId,
        permissionId: expect.objectContaining({ _type: 'in', _value: mockPermissionIds }),
      });
      expect(mockLogger.log).toHaveBeenCalledWith('역할 다중 권한 해제 성공', {
        roleId: mockRoleId,
        permissionCount: mockPermissionIds.length,
      });
    });

    it('레포지토리 오류 시 revokeMultipleError 예외를 던져야 함', async () => {
      // Given
      const mockError = new Error('Batch revoke failed');
      mockRolePermissionRepo.delete.mockRejectedValue(mockError);

      // When & Then
      await expect(service.revokeMultiplePermissions(mockTcpBatchDto)).rejects.toThrow(
        RolePermissionException.revokeMultipleError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('역할 다중 권한 해제 실패', {
        error: 'Batch revoke failed',
        roleId: mockRoleId,
        permissionCount: mockPermissionIds.length,
      });
    });
  });

  describe('replaceRolePermissions', () => {
    it('역할의 권한을 성공적으로 교체해야 함', async () => {
      // Given
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockManager = {
          delete: jest.fn().mockResolvedValue(mockDeleteResult),
          save: jest.fn().mockResolvedValue([]),
        };
        return await callback(mockManager);
      });
      mockRolePermissionRepo.manager.transaction = mockTransaction;

      // When
      await service.replaceRolePermissions(mockTcpBatchDto);

      // Then
      expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function));
      expect(mockLogger.log).toHaveBeenCalledWith('역할 권한 교체 성공', {
        roleId: mockRoleId,
        newPermissionCount: mockPermissionIds.length,
      });
    });

    it('빈 권한 목록으로 교체할 때 기존 권한만 삭제해야 함', async () => {
      // Given
      const emptyPermissionsDto: TcpRolePermissionBatch = {
        roleId: mockRoleId,
        permissionIds: [],
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockManager = {
          delete: jest.fn().mockResolvedValue(mockDeleteResult),
          save: jest.fn().mockResolvedValue([]),
        };
        return await callback(mockManager);
      });
      mockRolePermissionRepo.manager.transaction = mockTransaction;

      // When
      await service.replaceRolePermissions(emptyPermissionsDto);

      // Then
      expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function));
      expect(mockLogger.log).toHaveBeenCalledWith('역할 권한 교체 성공', {
        roleId: mockRoleId,
        newPermissionCount: 0,
      });
    });

    it('트랜잭션 오류 시 replaceError 예외를 던져야 함', async () => {
      // Given
      const mockError = new Error('Transaction failed');
      (mockRolePermissionRepo.manager.transaction as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      // When & Then
      await expect(service.replaceRolePermissions(mockTcpBatchDto)).rejects.toThrow(
        RolePermissionException.replaceError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('역할 권한 교체 실패', {
        error: 'Transaction failed',
        roleId: mockRoleId,
        newPermissionCount: mockPermissionIds.length,
      });
    });
  });

  describe('hasPermissionsForRole', () => {
    it('역할에 권한이 있을 때 true를 반환해야 함', async () => {
      // Given
      mockRolePermissionRepo.findPermissionIdsByRoleId.mockResolvedValue(['permission-1']);

      // When
      const result = await service.hasPermissionsForRole(mockRoleId);

      // Then
      expect(result).toBe(true);
      expect(mockRolePermissionRepo.findPermissionIdsByRoleId).toHaveBeenCalledWith(mockRoleId);
    });

    it('역할에 권한이 없을 때 false를 반환해야 함', async () => {
      // Given
      mockRolePermissionRepo.findPermissionIdsByRoleId.mockResolvedValue([]);

      // When
      const result = await service.hasPermissionsForRole(mockRoleId);

      // Then
      expect(result).toBe(false);
      expect(mockRolePermissionRepo.findPermissionIdsByRoleId).toHaveBeenCalledWith(mockRoleId);
    });

    it('레포지토리 오류 시 fetchError 예외를 던져야 함', async () => {
      // Given
      const mockError = new Error('Permission check failed');
      mockRolePermissionRepo.findPermissionIdsByRoleId.mockRejectedValue(mockError);

      // When & Then
      await expect(service.hasPermissionsForRole(mockRoleId)).rejects.toThrow(
        RolePermissionException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('역할의 권한 존재 확인 실패', {
        error: 'Permission check failed',
        roleId: mockRoleId,
      });
    });
  });
});
