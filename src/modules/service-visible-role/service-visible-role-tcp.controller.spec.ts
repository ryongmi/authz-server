import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import type { TcpServiceId } from '@krgeobuk/service/tcp';
import type { TcpRoleId } from '@krgeobuk/role/tcp/interfaces';
import type {
  TcpServiceVisibleRole,
  TcpServiceRoleBatch,
} from '@krgeobuk/service-visible-role/tcp/interfaces';
import type { ServiceVisibleRoleBatchAssignmentResult } from '@krgeobuk/service-visible-role/interfaces';

import { ServiceVisibleRoleTcpController } from './service-visible-role-tcp.controller.js';
import { ServiceVisibleRoleService } from './service-visible-role.service.js';

describe('ServiceVisibleRoleTcpController', () => {
  let controller: ServiceVisibleRoleTcpController;
  let serviceVisibleRoleService: jest.Mocked<ServiceVisibleRoleService>;
  let mockLogger: jest.Mocked<Logger>;

  // 테스트 데이터
  const mockTcpServiceId: TcpServiceId = {
    serviceId: 'service-123',
  };

  const mockTcpRoleId: TcpRoleId = {
    roleId: 'role-456',
  };

  const mockTcpServiceVisibleRole: TcpServiceVisibleRole = {
    serviceId: 'service-123',
    roleId: 'role-456',
  };

  const mockTcpServiceRoleBatch: TcpServiceRoleBatch = {
    serviceId: 'service-123',
    roleIds: ['role-1', 'role-2', 'role-3'],
  };

  const mockServiceIdsBatch = {
    serviceIds: ['service-1', 'service-2', 'service-3'],
  };

  const mockServiceVisibleRoleBatchResult: ServiceVisibleRoleBatchAssignmentResult = {
    success: true,
    affected: 2,
    details: {
      assigned: 2,
      skipped: 1,
      duplicates: ['role-1'],
      newAssignments: ['role-2', 'role-3'],
      serviceId: 'service-123',
      assignedRoles: ['role-2', 'role-3'],
    },
  };

  beforeEach(async () => {
    const mockSvrService = {
      getRoleIds: jest.fn(),
      getServiceIds: jest.fn(),
      getRoleCountsBatch: jest.fn(),
      exists: jest.fn(),
      assignMultipleRoles: jest.fn(),
      revokeMultipleRoles: jest.fn(),
      replaceServiceRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceVisibleRoleTcpController],
      providers: [
        {
          provide: ServiceVisibleRoleService,
          useValue: mockSvrService,
        },
      ],
    }).compile();

    controller = module.get<ServiceVisibleRoleTcpController>(ServiceVisibleRoleTcpController);
    serviceVisibleRoleService = module.get(ServiceVisibleRoleService);

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

  describe('findRoleIdsByServiceId', () => {
    it('TCP 서비스별 역할 ID 조회 요청을 처리해야 함', async () => {
      // Given
      const roleIds = ['role-1', 'role-2', 'role-3'];
      serviceVisibleRoleService.getRoleIds.mockResolvedValue(roleIds);

      // When
      const result = await controller.findRoleIdsByServiceId(mockTcpServiceId);

      // Then
      expect(result).toEqual(roleIds);
      expect(serviceVisibleRoleService.getRoleIds).toHaveBeenCalledWith('service-123');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'TCP service-visible-role find roles by service requested',
        { serviceId: 'service-123' }
      );
    });

    it('서비스에 가시화된 역할이 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      serviceVisibleRoleService.getRoleIds.mockResolvedValue([]);

      // When
      const result = await controller.findRoleIdsByServiceId(mockTcpServiceId);

      // Then
      expect(result).toEqual([]);
      expect(serviceVisibleRoleService.getRoleIds).toHaveBeenCalledWith('service-123');
    });

    it('TCP 서비스별 역할 조회 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = new Error('Service role fetch failed');
      serviceVisibleRoleService.getRoleIds.mockRejectedValue(error);

      // When & Then
      await expect(controller.findRoleIdsByServiceId(mockTcpServiceId)).rejects.toThrow(
        'Service role fetch failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TCP service-visible-role find roles by service failed',
        {
          error: 'Service role fetch failed',
          serviceId: 'service-123',
        }
      );
    });
  });

  describe('findServiceIdsByRoleId', () => {
    it('TCP 역할별 서비스 ID 조회 요청을 처리해야 함', async () => {
      // Given
      const serviceIds = ['service-1', 'service-2', 'service-3'];
      serviceVisibleRoleService.getServiceIds.mockResolvedValue(serviceIds);

      // When
      const result = await controller.findServiceIdsByRoleId(mockTcpRoleId);

      // Then
      expect(result).toEqual(serviceIds);
      expect(serviceVisibleRoleService.getServiceIds).toHaveBeenCalledWith('role-456');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'TCP service-visible-role find services by role requested',
        { roleId: 'role-456' }
      );
    });

    it('역할이 가시화된 서비스가 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      serviceVisibleRoleService.getServiceIds.mockResolvedValue([]);

      // When
      const result = await controller.findServiceIdsByRoleId(mockTcpRoleId);

      // Then
      expect(result).toEqual([]);
      expect(serviceVisibleRoleService.getServiceIds).toHaveBeenCalledWith('role-456');
    });

    it('TCP 역할별 서비스 조회 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = new Error('Role service fetch failed');
      serviceVisibleRoleService.getServiceIds.mockRejectedValue(error);

      // When & Then
      await expect(controller.findServiceIdsByRoleId(mockTcpRoleId)).rejects.toThrow(
        'Role service fetch failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TCP service-visible-role find services by role failed',
        {
          error: 'Role service fetch failed',
          roleId: 'role-456',
        }
      );
    });
  });

  describe('findRoleCountsBatch', () => {
    it('TCP 서비스별 역할 수 배치 조회 요청을 처리해야 함', async () => {
      // Given
      const roleCounts = {
        'service-1': 3,
        'service-2': 1,
        'service-3': 5,
      };
      serviceVisibleRoleService.getRoleCountsBatch.mockResolvedValue(roleCounts);

      // When
      const result = await controller.findRoleCountsBatch(mockServiceIdsBatch);

      // Then
      expect(result).toEqual(roleCounts);
      expect(serviceVisibleRoleService.getRoleCountsBatch).toHaveBeenCalledWith([
        'service-1',
        'service-2',
        'service-3',
      ]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'TCP service-visible-role find role count batch requested',
        { serviceCount: 3 }
      );
    });

    it('빈 서비스 목록으로 역할 수 배치 조회 요청을 처리해야 함', async () => {
      // Given
      const emptyBatch = { serviceIds: [] };
      serviceVisibleRoleService.getRoleCountsBatch.mockResolvedValue({});

      // When
      const result = await controller.findRoleCountsBatch(emptyBatch);

      // Then
      expect(result).toEqual({});
      expect(serviceVisibleRoleService.getRoleCountsBatch).toHaveBeenCalledWith([]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'TCP service-visible-role find role count batch requested',
        { serviceCount: 0 }
      );
    });

    it('TCP 역할 수 배치 조회 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = new Error('Role count batch failed');
      serviceVisibleRoleService.getRoleCountsBatch.mockRejectedValue(error);

      // When & Then
      await expect(controller.findRoleCountsBatch(mockServiceIdsBatch)).rejects.toThrow(
        'Role count batch failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TCP service-visible-role find role count batch failed',
        {
          error: 'Role count batch failed',
          serviceCount: 3,
        }
      );
    });
  });

  describe('existsServiceVisibleRole', () => {
    it('TCP 서비스-역할 관계 존재 확인 요청을 처리해야 함', async () => {
      // Given
      serviceVisibleRoleService.exists.mockResolvedValue(true);

      // When
      const result = await controller.existsServiceVisibleRole(mockTcpServiceVisibleRole);

      // Then
      expect(result).toBe(true);
      expect(serviceVisibleRoleService.exists).toHaveBeenCalledWith(mockTcpServiceVisibleRole);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'TCP service-visible-role exists check requested',
        {
          serviceId: 'service-123',
          roleId: 'role-456',
        }
      );
    });

    it('서비스-역할 관계가 존재하지 않으면 false를 반환해야 함', async () => {
      // Given
      serviceVisibleRoleService.exists.mockResolvedValue(false);

      // When
      const result = await controller.existsServiceVisibleRole(mockTcpServiceVisibleRole);

      // Then
      expect(result).toBe(false);
      expect(serviceVisibleRoleService.exists).toHaveBeenCalledWith(mockTcpServiceVisibleRole);
    });

    it('TCP 서비스-역할 존재 확인 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = new Error('Existence check failed');
      serviceVisibleRoleService.exists.mockRejectedValue(error);

      // When & Then
      await expect(controller.existsServiceVisibleRole(mockTcpServiceVisibleRole)).rejects.toThrow(
        'Existence check failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TCP service-visible-role exists check failed',
        {
          error: 'Existence check failed',
          serviceId: 'service-123',
          roleId: 'role-456',
        }
      );
    });
  });

  describe('assignMultipleRoles', () => {
    it('TCP 여러 역할 가시화 할당 요청을 처리해야 함', async () => {
      // Given
      serviceVisibleRoleService.assignMultipleRoles.mockResolvedValue(
        mockServiceVisibleRoleBatchResult
      );

      // When
      const result = await controller.assignMultipleRoles(mockTcpServiceRoleBatch);

      // Then
      expect(result).toEqual({ success: true });
      expect(serviceVisibleRoleService.assignMultipleRoles).toHaveBeenCalledWith(
        mockTcpServiceRoleBatch
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'TCP service-visible-role assign multiple roles requested',
        {
          serviceId: 'service-123',
          roleCount: 3,
        }
      );
    });

    it('빈 역할 목록으로 배치 할당 요청을 처리해야 함', async () => {
      // Given
      const emptyBatchData: TcpServiceRoleBatch = {
        serviceId: 'service-123',
        roleIds: [],
      };
      serviceVisibleRoleService.assignMultipleRoles.mockResolvedValue(
        mockServiceVisibleRoleBatchResult
      );

      // When
      const result = await controller.assignMultipleRoles(emptyBatchData);

      // Then
      expect(result).toEqual({ success: true });
      expect(serviceVisibleRoleService.assignMultipleRoles).toHaveBeenCalledWith(emptyBatchData);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'TCP service-visible-role assign multiple roles requested',
        {
          serviceId: 'service-123',
          roleCount: 0,
        }
      );
    });

    it('TCP 여러 역할 할당 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = new Error('Multiple role assignment failed');
      serviceVisibleRoleService.assignMultipleRoles.mockRejectedValue(error);

      // When & Then
      await expect(controller.assignMultipleRoles(mockTcpServiceRoleBatch)).rejects.toThrow(
        'Multiple role assignment failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TCP service-visible-role assign multiple roles failed',
        {
          error: 'Multiple role assignment failed',
          serviceId: 'service-123',
          roleCount: 3,
        }
      );
    });
  });

  describe('revokeMultipleRoles', () => {
    it('TCP 여러 역할 가시화 해제 요청을 처리해야 함', async () => {
      // Given
      serviceVisibleRoleService.revokeMultipleRoles.mockResolvedValue(undefined);

      // When
      const result = await controller.revokeMultipleRoles(mockTcpServiceRoleBatch);

      // Then
      expect(result).toEqual({ success: true });
      expect(serviceVisibleRoleService.revokeMultipleRoles).toHaveBeenCalledWith(
        mockTcpServiceRoleBatch
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'TCP service-visible-role revoke multiple roles requested',
        {
          serviceId: 'service-123',
          roleCount: 3,
        }
      );
    });

    it('빈 역할 목록으로 배치 해제 요청을 처리해야 함', async () => {
      // Given
      const emptyBatchData: TcpServiceRoleBatch = {
        serviceId: 'service-123',
        roleIds: [],
      };
      serviceVisibleRoleService.revokeMultipleRoles.mockResolvedValue(undefined);

      // When
      const result = await controller.revokeMultipleRoles(emptyBatchData);

      // Then
      expect(result).toEqual({ success: true });
      expect(serviceVisibleRoleService.revokeMultipleRoles).toHaveBeenCalledWith(emptyBatchData);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'TCP service-visible-role revoke multiple roles requested',
        {
          serviceId: 'service-123',
          roleCount: 0,
        }
      );
    });

    it('TCP 여러 역할 해제 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = new Error('Multiple role revocation failed');
      serviceVisibleRoleService.revokeMultipleRoles.mockRejectedValue(error);

      // When & Then
      await expect(controller.revokeMultipleRoles(mockTcpServiceRoleBatch)).rejects.toThrow(
        'Multiple role revocation failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TCP service-visible-role revoke multiple roles failed',
        {
          error: 'Multiple role revocation failed',
          serviceId: 'service-123',
          roleCount: 3,
        }
      );
    });
  });

  describe('replaceServiceRoles', () => {
    it('TCP 서비스 역할 교체 요청을 처리해야 함', async () => {
      // Given
      serviceVisibleRoleService.replaceServiceRoles.mockResolvedValue(undefined);

      // When
      const result = await controller.replaceServiceRoles(mockTcpServiceRoleBatch);

      // Then
      expect(result).toEqual({ success: true });
      expect(serviceVisibleRoleService.replaceServiceRoles).toHaveBeenCalledWith(
        mockTcpServiceRoleBatch
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'TCP service-visible-role replace service roles requested',
        {
          serviceId: 'service-123',
          newRoleCount: 3,
        }
      );
    });

    it('빈 역할 목록으로 역할 교체 요청을 처리해야 함 (모든 역할 제거)', async () => {
      // Given
      const emptyBatchData: TcpServiceRoleBatch = {
        serviceId: 'service-123',
        roleIds: [],
      };
      serviceVisibleRoleService.replaceServiceRoles.mockResolvedValue(undefined);

      // When
      const result = await controller.replaceServiceRoles(emptyBatchData);

      // Then
      expect(result).toEqual({ success: true });
      expect(serviceVisibleRoleService.replaceServiceRoles).toHaveBeenCalledWith(emptyBatchData);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'TCP service-visible-role replace service roles requested',
        {
          serviceId: 'service-123',
          newRoleCount: 0,
        }
      );
    });

    it('TCP 서비스 역할 교체 실패 시 에러를 던져야 함', async () => {
      // Given
      const error = new Error('Service role replacement failed');
      serviceVisibleRoleService.replaceServiceRoles.mockRejectedValue(error);

      // When & Then
      await expect(controller.replaceServiceRoles(mockTcpServiceRoleBatch)).rejects.toThrow(
        'Service role replacement failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TCP service-visible-role replace service roles failed',
        {
          error: 'Service role replacement failed',
          serviceId: 'service-123',
          newRoleCount: 3,
        }
      );
    });
  });

  it('TCP 컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });
});
