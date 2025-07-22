import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import type { ServiceVisibleRoleParams } from '@krgeobuk/shared/service-visible-role';
import type { TcpServiceRoleBatch } from '@krgeobuk/service-visible-role/tcp/interfaces';
import type { ServiceVisibleRoleBatchAssignmentResult } from '@krgeobuk/service-visible-role/interfaces';
import { ServiceVisibleRoleException } from '@krgeobuk/service-visible-role/exception';

import { ServiceVisibleRoleRepository } from './service-visible-role.repository.js';
import { ServiceVisibleRoleService } from './service-visible-role.service.js';
import { ServiceVisibleRoleEntity } from './entities/service-visible-role.entity.js';

describe('ServiceVisibleRoleService', () => {
  let service: ServiceVisibleRoleService;
  let mockServiceVisibleRoleRepo: jest.Mocked<ServiceVisibleRoleRepository>;
  let mockLogger: jest.Mocked<Logger>;

  // 테스트 데이터 상수
  const mockServiceId = 'service-123';
  const mockRoleId = 'role-456';
  const mockRoleIds = ['role-456', 'role-789', 'role-abc'];
  const mockServiceIds = ['service-123', 'service-456', 'service-789'];

  const mockServiceVisibleRoleParams: ServiceVisibleRoleParams = {
    serviceId: mockServiceId,
    roleId: mockRoleId,
  };

  const mockTcpBatchDto: TcpServiceRoleBatch = {
    serviceId: mockServiceId,
    roleIds: mockRoleIds,
  };

  const mockServiceVisibleRoleEntity: ServiceVisibleRoleEntity = {
    serviceId: mockServiceId,
    roleId: mockRoleId,
  } as ServiceVisibleRoleEntity;

  const mockDeleteResult = {
    affected: 1,
    raw: {},
    generatedMaps: [],
  };

  beforeEach(async () => {
    const mockRepo = {
      findRoleIdsByServiceId: jest.fn(),
      findServiceIdsByRoleId: jest.fn(),
      existsServiceVisibleRole: jest.fn(),
      findRoleIdsByServiceIds: jest.fn(),
      findServiceIdsByRoleIds: jest.fn(),
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
        ServiceVisibleRoleService,
        {
          provide: ServiceVisibleRoleRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ServiceVisibleRoleService>(ServiceVisibleRoleService);
    mockServiceVisibleRoleRepo = module.get(ServiceVisibleRoleRepository);
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

  describe('getRoleIds', () => {
    it('서비스의 역할 ID 목록을 성공적으로 반환해야 함', async () => {
      // Given
      mockServiceVisibleRoleRepo.findRoleIdsByServiceId.mockResolvedValue(mockRoleIds);

      // When
      const result = await service.getRoleIds(mockServiceId);

      // Then
      expect(result).toEqual(mockRoleIds);
      expect(mockServiceVisibleRoleRepo.findRoleIdsByServiceId).toHaveBeenCalledWith(mockServiceId);
      expect(mockServiceVisibleRoleRepo.findRoleIdsByServiceId).toHaveBeenCalledTimes(1);
    });

    it('레포지토리 오류 시 ServiceVisibleRoleException.fetchError를 던져야 함', async () => {
      // Given
      const mockError = new Error('Database error');
      mockServiceVisibleRoleRepo.findRoleIdsByServiceId.mockRejectedValue(mockError);

      // When & Then
      await expect(service.getRoleIds(mockServiceId)).rejects.toThrow(
        ServiceVisibleRoleException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Role IDs fetch by service failed', {
        error: 'Database error',
        serviceId: mockServiceId,
      });
    });
  });

  describe('getServiceIds', () => {
    it('역할의 서비스 ID 목록을 성공적으로 반환해야 함', async () => {
      // Given
      mockServiceVisibleRoleRepo.findServiceIdsByRoleId.mockResolvedValue(mockServiceIds);

      // When
      const result = await service.getServiceIds(mockRoleId);

      // Then
      expect(result).toEqual(mockServiceIds);
      expect(mockServiceVisibleRoleRepo.findServiceIdsByRoleId).toHaveBeenCalledWith(mockRoleId);
      expect(mockServiceVisibleRoleRepo.findServiceIdsByRoleId).toHaveBeenCalledTimes(1);
    });

    it('레포지토리 오류 시 ServiceVisibleRoleException.fetchError를 던져야 함', async () => {
      // Given
      const mockError = new Error('Database connection failed');
      mockServiceVisibleRoleRepo.findServiceIdsByRoleId.mockRejectedValue(mockError);

      // When & Then
      await expect(service.getServiceIds(mockRoleId)).rejects.toThrow(
        ServiceVisibleRoleException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Service IDs fetch by role failed', {
        error: 'Database connection failed',
        roleId: mockRoleId,
      });
    });
  });

  describe('exists', () => {
    it('서비스-역할 관계가 존재할 때 true를 반환해야 함', async () => {
      // Given
      mockServiceVisibleRoleRepo.existsServiceVisibleRole.mockResolvedValue(true);

      // When
      const result = await service.exists(mockServiceVisibleRoleParams);

      // Then
      expect(result).toBe(true);
      expect(mockServiceVisibleRoleRepo.existsServiceVisibleRole).toHaveBeenCalledWith(
        mockServiceId,
        mockRoleId
      );
    });

    it('서비스-역할 관계가 존재하지 않을 때 false를 반환해야 함', async () => {
      // Given
      mockServiceVisibleRoleRepo.existsServiceVisibleRole.mockResolvedValue(false);

      // When
      const result = await service.exists(mockServiceVisibleRoleParams);

      // Then
      expect(result).toBe(false);
      expect(mockServiceVisibleRoleRepo.existsServiceVisibleRole).toHaveBeenCalledWith(
        mockServiceId,
        mockRoleId
      );
    });

    it('레포지토리 오류 시 ServiceVisibleRoleException.fetchError를 던져야 함', async () => {
      // Given
      const mockError = new Error('Connection timeout');
      mockServiceVisibleRoleRepo.existsServiceVisibleRole.mockRejectedValue(mockError);

      // When & Then
      await expect(service.exists(mockServiceVisibleRoleParams)).rejects.toThrow(
        ServiceVisibleRoleException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Service visible role existence check failed', {
        error: 'Connection timeout',
        serviceId: mockServiceId,
        roleId: mockRoleId,
      });
    });
  });

  describe('getRoleIdsBatch', () => {
    it('여러 서비스의 역할 ID 배치를 성공적으로 반환해야 함', async () => {
      // Given
      const mockBatchResult: Record<string, string[]> = {
        'service-123': ['role-1', 'role-2'],
        'service-456': ['role-3'],
        'service-789': [],
      };
      mockServiceVisibleRoleRepo.findRoleIdsByServiceIds.mockResolvedValue(mockBatchResult);

      // When
      const result = await service.getRoleIdsBatch(mockServiceIds);

      // Then
      expect(result).toEqual(mockBatchResult);
      expect(mockServiceVisibleRoleRepo.findRoleIdsByServiceIds).toHaveBeenCalledWith(
        mockServiceIds
      );
    });

    it('레포지토리 오류 시 ServiceVisibleRoleException.fetchError를 던져야 함', async () => {
      // Given
      const mockError = new Error('Batch query failed');
      mockServiceVisibleRoleRepo.findRoleIdsByServiceIds.mockRejectedValue(mockError);

      // When & Then
      await expect(service.getRoleIdsBatch(mockServiceIds)).rejects.toThrow(
        ServiceVisibleRoleException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Role IDs fetch by services failed', {
        error: 'Batch query failed',
        serviceCount: mockServiceIds.length,
      });
    });
  });

  describe('getServiceIdsBatch', () => {
    it('여러 역할의 서비스 ID 배치를 성공적으로 반환해야 함', async () => {
      // Given
      const mockBatchResult: Record<string, string[]> = {
        'role-456': ['service-1', 'service-2'],
        'role-789': ['service-3'],
        'role-abc': [],
      };
      mockServiceVisibleRoleRepo.findServiceIdsByRoleIds.mockResolvedValue(mockBatchResult);

      // When
      const result = await service.getServiceIdsBatch(mockRoleIds);

      // Then
      expect(result).toEqual(mockBatchResult);
      expect(mockServiceVisibleRoleRepo.findServiceIdsByRoleIds).toHaveBeenCalledWith(mockRoleIds);
    });

    it('레포지토리 오류 시 ServiceVisibleRoleException.fetchError를 던져야 함', async () => {
      // Given
      const mockError = new Error('Service batch failed');
      mockServiceVisibleRoleRepo.findServiceIdsByRoleIds.mockRejectedValue(mockError);

      // When & Then
      await expect(service.getServiceIdsBatch(mockRoleIds)).rejects.toThrow(
        ServiceVisibleRoleException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Service IDs fetch by roles failed', {
        error: 'Service batch failed',
        roleCount: mockRoleIds.length,
      });
    });
  });

  describe('getRoleCountsBatch', () => {
    it('여러 서비스의 역할 수를 성공적으로 계산하여 반환해야 함', async () => {
      // Given
      const mockRoleIdsMap: Record<string, string[]> = {
        'service-123': ['role-1', 'role-2'],
        'service-456': ['role-3'],
        'service-789': [],
      };
      const expectedCounts: Record<string, number> = {
        'service-123': 2,
        'service-456': 1,
        'service-789': 0,
      };
      mockServiceVisibleRoleRepo.findRoleIdsByServiceIds.mockResolvedValue(mockRoleIdsMap);

      // When
      const result = await service.getRoleCountsBatch(mockServiceIds);

      // Then
      expect(result).toEqual(expectedCounts);
      expect(mockServiceVisibleRoleRepo.findRoleIdsByServiceIds).toHaveBeenCalledWith(
        mockServiceIds
      );
    });

    it('레포지토리 오류 시 ServiceVisibleRoleException.fetchError를 던져야 함', async () => {
      // Given
      const mockError = new Error('Role count batch failed');
      mockServiceVisibleRoleRepo.findRoleIdsByServiceIds.mockRejectedValue(mockError);

      // When & Then
      await expect(service.getRoleCountsBatch(mockServiceIds)).rejects.toThrow(
        ServiceVisibleRoleException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('서비스별 역할 수 조회 실패', {
        error: 'Role count batch failed',
        serviceCount: mockServiceIds.length,
      });
    });
  });

  // ==================== 변경 메서드 테스트 ====================

  describe('assignServiceVisibleRole', () => {
    it('서비스-역할을 성공적으로 할당해야 함', async () => {
      // Given
      mockServiceVisibleRoleRepo.existsServiceVisibleRole.mockResolvedValue(false); // 중복 없음
      mockServiceVisibleRoleRepo.save.mockResolvedValue(mockServiceVisibleRoleEntity);

      // When
      await service.assignServiceVisibleRole(mockServiceVisibleRoleParams);

      // Then
      expect(mockServiceVisibleRoleRepo.existsServiceVisibleRole).toHaveBeenCalledWith(
        mockServiceId,
        mockRoleId
      );
      expect(mockServiceVisibleRoleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: mockServiceId,
          roleId: mockRoleId,
        })
      );
      expect(mockLogger.log).toHaveBeenCalledWith('서비스-역할 할당 성공', {
        serviceId: mockServiceId,
        roleId: mockRoleId,
      });
    });

    it('이미 존재하는 서비스-역할 관계일 때 serviceVisibleRoleAlreadyExists 예외를 던져야 함', async () => {
      // Given
      mockServiceVisibleRoleRepo.existsServiceVisibleRole.mockResolvedValue(true); // 중복 존재

      // When & Then
      await expect(service.assignServiceVisibleRole(mockServiceVisibleRoleParams)).rejects.toThrow(
        ServiceVisibleRoleException.serviceVisibleRoleAlreadyExists()
      );
      expect(mockLogger.warn).toHaveBeenCalledWith('서비스-역할 관계 이미 존재', {
        serviceId: mockServiceId,
        roleId: mockRoleId,
      });
      expect(mockServiceVisibleRoleRepo.save).not.toHaveBeenCalled();
    });

    it('레포지토리 오류 시 assignError 예외를 던져야 함', async () => {
      // Given
      mockServiceVisibleRoleRepo.existsServiceVisibleRole.mockResolvedValue(false);
      const mockError = new Error('Save failed');
      mockServiceVisibleRoleRepo.save.mockRejectedValue(mockError);

      // When & Then
      await expect(service.assignServiceVisibleRole(mockServiceVisibleRoleParams)).rejects.toThrow(
        ServiceVisibleRoleException.assignError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('서비스-역할 할당 실패', {
        error: 'Save failed',
        serviceId: mockServiceId,
        roleId: mockRoleId,
      });
    });
  });

  describe('revokeServiceVisibleRole', () => {
    it('서비스-역할을 성공적으로 해제해야 함', async () => {
      // Given
      mockServiceVisibleRoleRepo.delete.mockResolvedValue(mockDeleteResult);

      // When
      await service.revokeServiceVisibleRole(mockServiceVisibleRoleParams);

      // Then
      expect(mockServiceVisibleRoleRepo.delete).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleId: mockRoleId,
      });
      expect(mockLogger.log).toHaveBeenCalledWith('서비스-역할 해제 성공', {
        serviceId: mockServiceId,
        roleId: mockRoleId,
      });
    });

    it('존재하지 않는 서비스-역할 관계일 때 serviceVisibleRoleNotFound 예외를 던져야 함', async () => {
      // Given
      const mockDeleteResultNotFound = { affected: 0, raw: {}, generatedMaps: [] };
      mockServiceVisibleRoleRepo.delete.mockResolvedValue(mockDeleteResultNotFound);

      // When & Then
      await expect(service.revokeServiceVisibleRole(mockServiceVisibleRoleParams)).rejects.toThrow(
        ServiceVisibleRoleException.serviceVisibleRoleNotFound()
      );
      expect(mockLogger.warn).toHaveBeenCalledWith('해제할 서비스-역할 관계를 찾을 수 없음', {
        serviceId: mockServiceId,
        roleId: mockRoleId,
      });
    });

    it('레포지토리 오류 시 revokeError 예외를 던져야 함', async () => {
      // Given
      const mockError = new Error('Delete failed');
      mockServiceVisibleRoleRepo.delete.mockRejectedValue(mockError);

      // When & Then
      await expect(service.revokeServiceVisibleRole(mockServiceVisibleRoleParams)).rejects.toThrow(
        ServiceVisibleRoleException.revokeError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('서비스-역할 해제 실패', {
        error: 'Delete failed',
        serviceId: mockServiceId,
        roleId: mockRoleId,
      });
    });
  });

  // ==================== 배치 처리 메서드 테스트 ====================

  describe('assignMultipleRoles', () => {
    it('여러 역할을 성공적으로 할당해야 함', async () => {
      // Given - 일부 중복, 일부 신규
      const existingRoles = ['role-456']; // 기존 역할
      const expectedNewRoles = ['role-789', 'role-abc']; // 신규 역할
      const expectedDuplicates = ['role-456'];

      mockServiceVisibleRoleRepo.findRoleIdsByServiceId.mockResolvedValue(existingRoles);
      mockServiceVisibleRoleRepo.save.mockResolvedValue(mockServiceVisibleRoleEntity);

      const expectedResult: ServiceVisibleRoleBatchAssignmentResult = {
        success: true,
        affected: 2,
        details: {
          assigned: 2,
          skipped: 1,
          duplicates: expectedDuplicates,
          newAssignments: expectedNewRoles,
          serviceId: mockServiceId,
          assignedRoles: expectedNewRoles,
        },
      };

      // When
      const result = await service.assignMultipleRoles(mockTcpBatchDto);

      // Then
      expect(result).toEqual(expectedResult);
      expect(mockServiceVisibleRoleRepo.findRoleIdsByServiceId).toHaveBeenCalledWith(mockServiceId);
      expect(mockServiceVisibleRoleRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ serviceId: mockServiceId, roleId: 'role-789' }),
          expect.objectContaining({ serviceId: mockServiceId, roleId: 'role-abc' }),
        ])
      );
      expect(mockLogger.log).toHaveBeenCalledWith('서비스 다중 역할 할당 성공', {
        serviceId: mockServiceId,
        assignedCount: 2,
        skippedCount: 1,
        totalRequested: 3,
      });
    });

    it('모든 역할이 이미 할당된 경우 할당 없이 결과를 반환해야 함', async () => {
      // Given - 모든 역할이 기존에 존재
      mockServiceVisibleRoleRepo.findRoleIdsByServiceId.mockResolvedValue(mockRoleIds);

      const expectedResult: ServiceVisibleRoleBatchAssignmentResult = {
        success: true,
        affected: 0,
        details: {
          assigned: 0,
          skipped: 3,
          duplicates: mockRoleIds,
          newAssignments: [],
          serviceId: mockServiceId,
          assignedRoles: [],
        },
      };

      // When
      const result = await service.assignMultipleRoles(mockTcpBatchDto);

      // Then
      expect(result).toEqual(expectedResult);
      expect(mockServiceVisibleRoleRepo.save).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '새로운 역할 할당 없음 - 모든 역할이 이미 존재',
        {
          serviceId: mockServiceId,
          requestedCount: 3,
          duplicateCount: 3,
        }
      );
    });

    it('레포지토리 오류 시 fetchError 예외를 던져야 함', async () => {
      // Given
      const mockError = new Error('Batch assignment failed');
      mockServiceVisibleRoleRepo.findRoleIdsByServiceId.mockRejectedValue(mockError);

      // When & Then
      await expect(service.assignMultipleRoles(mockTcpBatchDto)).rejects.toThrow(
        ServiceVisibleRoleException.assignMultipleError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Role IDs fetch by service failed', {
        error: 'Batch assignment failed',
        serviceId: mockServiceId,
      });
    });
  });

  describe('revokeMultipleRoles', () => {
    it('여러 역할을 성공적으로 해제해야 함', async () => {
      // Given
      mockServiceVisibleRoleRepo.delete.mockResolvedValue(mockDeleteResult);

      // When
      await service.revokeMultipleRoles(mockTcpBatchDto);

      // Then
      expect(mockServiceVisibleRoleRepo.delete).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleId: expect.objectContaining({ _type: 'in', _value: mockRoleIds }),
      });
      expect(mockLogger.log).toHaveBeenCalledWith('서비스 다중 역할 해제 성공', {
        serviceId: mockServiceId,
        roleCount: mockRoleIds.length,
      });
    });

    it('레포지토리 오류 시 revokeMultipleError 예외를 던져야 함', async () => {
      // Given
      const mockError = new Error('Batch revoke failed');
      mockServiceVisibleRoleRepo.delete.mockRejectedValue(mockError);

      // When & Then
      await expect(service.revokeMultipleRoles(mockTcpBatchDto)).rejects.toThrow(
        ServiceVisibleRoleException.revokeMultipleError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('서비스 다중 역할 해제 실패', {
        error: 'Batch revoke failed',
        serviceId: mockServiceId,
        roleCount: mockRoleIds.length,
      });
    });
  });

  describe('replaceServiceRoles', () => {
    it('서비스의 역할을 성공적으로 교체해야 함', async () => {
      // Given
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockManager = {
          delete: jest.fn().mockResolvedValue(mockDeleteResult),
          save: jest.fn().mockResolvedValue([]),
        };
        return await callback(mockManager);
      });
      mockServiceVisibleRoleRepo.manager.transaction = mockTransaction;

      // When
      await service.replaceServiceRoles(mockTcpBatchDto);

      // Then
      expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function));
      expect(mockLogger.log).toHaveBeenCalledWith('서비스 역할 교체 성공', {
        serviceId: mockServiceId,
        newRoleCount: mockRoleIds.length,
      });
    });

    it('빈 역할 목록으로 교체할 때 기존 역할만 삭제해야 함', async () => {
      // Given
      const emptyRolesDto: TcpServiceRoleBatch = {
        serviceId: mockServiceId,
        roleIds: [],
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockManager = {
          delete: jest.fn().mockResolvedValue(mockDeleteResult),
          save: jest.fn().mockResolvedValue([mockServiceVisibleRoleEntity]),
        };
        return await callback(mockManager);
      });
      mockServiceVisibleRoleRepo.manager.transaction = mockTransaction;

      // When
      await service.replaceServiceRoles(emptyRolesDto);

      // Then
      expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function));
      expect(mockLogger.log).toHaveBeenCalledWith('서비스 역할 교체 성공', {
        serviceId: mockServiceId,
        newRoleCount: 0,
      });
    });

    it('트랜잭션 오류 시 replaceError 예외를 던져야 함', async () => {
      // Given
      const mockError = new Error('Transaction failed');
      (mockServiceVisibleRoleRepo.manager.transaction as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      // When & Then
      await expect(service.replaceServiceRoles(mockTcpBatchDto)).rejects.toThrow(
        ServiceVisibleRoleException.replaceError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('서비스 역할 교체 실패', {
        error: 'Transaction failed',
        serviceId: mockServiceId,
        newRoleCount: mockRoleIds.length,
      });
    });
  });

  describe('hasServicesForRole', () => {
    it('역할에 서비스가 있을 때 true를 반환해야 함', async () => {
      // Given
      mockServiceVisibleRoleRepo.findServiceIdsByRoleId.mockResolvedValue(['service-1']);

      // When
      const result = await service.hasServicesForRole(mockRoleId);

      // Then
      expect(result).toBe(true);
      expect(mockServiceVisibleRoleRepo.findServiceIdsByRoleId).toHaveBeenCalledWith(mockRoleId);
    });

    it('역할에 서비스가 없을 때 false를 반환해야 함', async () => {
      // Given
      mockServiceVisibleRoleRepo.findServiceIdsByRoleId.mockResolvedValue([]);

      // When
      const result = await service.hasServicesForRole(mockRoleId);

      // Then
      expect(result).toBe(false);
      expect(mockServiceVisibleRoleRepo.findServiceIdsByRoleId).toHaveBeenCalledWith(mockRoleId);
    });

    it('레포지토리 오류 시 fetchError 예외를 던져야 함', async () => {
      // Given
      const mockError = new Error('Service check failed');
      mockServiceVisibleRoleRepo.findServiceIdsByRoleId.mockRejectedValue(mockError);

      // When & Then
      await expect(service.hasServicesForRole(mockRoleId)).rejects.toThrow(
        ServiceVisibleRoleException.fetchError()
      );
      expect(mockLogger.error).toHaveBeenCalledWith('역할의 서비스 존재 확인 실패', {
        error: 'Service check failed',
        roleId: mockRoleId,
      });
    });
  });
});
