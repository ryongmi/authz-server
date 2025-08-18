import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { AccessTokenGuard } from '@krgeobuk/jwt/guards';

import { ServiceVisibleRoleParamsDto } from '@krgeobuk/shared/service-visible-role';
import { ServiceIdParamsDto } from '@krgeobuk/shared/service';
import { RoleIdParamsDto } from '@krgeobuk/shared/role';
import { RoleIdsDto } from '@krgeobuk/service-visible-role/dtos';
import type { ServiceVisibleRoleBatchAssignmentResult } from '@krgeobuk/service-visible-role/interfaces';
import { ServiceVisibleRoleException } from '@krgeobuk/service-visible-role/exception';

import { ServiceVisibleRoleController } from './service-visible-role.controller.js';
import { ServiceVisibleRoleService } from './service-visible-role.service.js';

describe('ServiceVisibleRoleController', () => {
  let controller: ServiceVisibleRoleController;
  let mockServiceVisibleRoleService: jest.Mocked<ServiceVisibleRoleService>;

  // 테스트 데이터 상수
  const mockServiceId = 'service-123';
  const mockRoleId = 'role-456';
  const mockRoleIds = ['role-456', 'role-789', 'role-abc'];
  const mockServiceIds = ['service-123', 'service-456', 'service-789'];

  const mockServiceIdParams: ServiceIdParamsDto = {
    serviceId: mockServiceId,
  };

  const mockRoleIdParams: RoleIdParamsDto = {
    roleId: mockRoleId,
  };

  const mockServiceVisibleRoleParams: ServiceVisibleRoleParamsDto = {
    serviceId: mockServiceId,
    roleId: mockRoleId,
  };

  const mockRoleIdsDto: RoleIdsDto = {
    roleIds: mockRoleIds,
  };

  const mockServiceVisibleRoleBatchResult: ServiceVisibleRoleBatchAssignmentResult = {
    success: true,
    affected: 2,
    details: {
      assigned: 2,
      skipped: 1,
      duplicates: ['role-456'],
      newAssignments: ['role-789', 'role-abc'],
      serviceId: mockServiceId,
      assignedRoles: ['role-789', 'role-abc'],
    },
  };

  beforeEach(async () => {
    const mockService = {
      getRoleIds: jest.fn(),
      getServiceIds: jest.fn(),
      exists: jest.fn(),
      assignServiceVisibleRole: jest.fn(),
      revokeServiceVisibleRole: jest.fn(),
      assignMultipleRoles: jest.fn(),
      revokeMultipleRoles: jest.fn(),
      replaceServiceRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceVisibleRoleController],
      providers: [
        {
          provide: ServiceVisibleRoleService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<ServiceVisibleRoleController>(ServiceVisibleRoleController);
    mockServiceVisibleRoleService = module.get(ServiceVisibleRoleService);
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

  describe('getRoleIdsByServiceId', () => {
    it('서비스의 역할 ID 목록을 성공적으로 반환해야 함', async () => {
      // Given
      mockServiceVisibleRoleService.getRoleIds.mockResolvedValue(mockRoleIds);

      // When
      const result = await controller.getRoleIdsByServiceId(mockServiceIdParams);

      // Then
      expect(result).toEqual(mockRoleIds);
      expect(mockServiceVisibleRoleService.getRoleIds).toHaveBeenCalledWith(mockServiceId);
      expect(mockServiceVisibleRoleService.getRoleIds).toHaveBeenCalledTimes(1);
    });

    it('서비스 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = ServiceVisibleRoleException.fetchError();
      mockServiceVisibleRoleService.getRoleIds.mockRejectedValue(mockError);

      // When & Then
      await expect(controller.getRoleIdsByServiceId(mockServiceIdParams)).rejects.toThrow(
        ServiceVisibleRoleException.fetchError()
      );
      expect(mockServiceVisibleRoleService.getRoleIds).toHaveBeenCalledWith(mockServiceId);
    });
  });

  describe('getServiceIdsByRoleId', () => {
    it('역할의 서비스 ID 목록을 성공적으로 반환해야 함', async () => {
      // Given
      mockServiceVisibleRoleService.getServiceIds.mockResolvedValue(mockServiceIds);

      // When
      const result = await controller.getServiceIdsByRoleId(mockRoleIdParams);

      // Then
      expect(result).toEqual(mockServiceIds);
      expect(mockServiceVisibleRoleService.getServiceIds).toHaveBeenCalledWith(mockRoleId);
      expect(mockServiceVisibleRoleService.getServiceIds).toHaveBeenCalledTimes(1);
    });

    it('서비스 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = ServiceVisibleRoleException.fetchError();
      mockServiceVisibleRoleService.getServiceIds.mockRejectedValue(mockError);

      // When & Then
      await expect(controller.getServiceIdsByRoleId(mockRoleIdParams)).rejects.toThrow(
        ServiceVisibleRoleException.fetchError()
      );
      expect(mockServiceVisibleRoleService.getServiceIds).toHaveBeenCalledWith(mockRoleId);
    });
  });

  describe('checkServiceVisibleRoleExists', () => {
    it('서비스-역할 관계가 존재할 때 true를 반환해야 함', async () => {
      // Given
      mockServiceVisibleRoleService.exists.mockResolvedValue(true);

      // When
      const result = await controller.checkServiceVisibleRoleExists(mockServiceVisibleRoleParams);

      // Then
      expect(result).toBe(true);
      expect(mockServiceVisibleRoleService.exists).toHaveBeenCalledWith(
        mockServiceVisibleRoleParams
      );
      expect(mockServiceVisibleRoleService.exists).toHaveBeenCalledTimes(1);
    });

    it('서비스-역할 관계가 존재하지 않을 때 false를 반환해야 함', async () => {
      // Given
      mockServiceVisibleRoleService.exists.mockResolvedValue(false);

      // When
      const result = await controller.checkServiceVisibleRoleExists(mockServiceVisibleRoleParams);

      // Then
      expect(result).toBe(false);
      expect(mockServiceVisibleRoleService.exists).toHaveBeenCalledWith(
        mockServiceVisibleRoleParams
      );
    });

    it('서비스 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = ServiceVisibleRoleException.fetchError();
      mockServiceVisibleRoleService.exists.mockRejectedValue(mockError);

      // When & Then
      await expect(
        controller.checkServiceVisibleRoleExists(mockServiceVisibleRoleParams)
      ).rejects.toThrow(ServiceVisibleRoleException.fetchError());
      expect(mockServiceVisibleRoleService.exists).toHaveBeenCalledWith(
        mockServiceVisibleRoleParams
      );
    });
  });

  // ==================== 변경 API 테스트 ====================

  describe('assignServiceVisibleRole', () => {
    it('서비스-역할 할당을 성공적으로 수행해야 함', async () => {
      // Given
      mockServiceVisibleRoleService.assignServiceVisibleRole.mockResolvedValue(undefined);

      // When
      await controller.assignServiceVisibleRole(mockServiceVisibleRoleParams);

      // Then
      expect(mockServiceVisibleRoleService.assignServiceVisibleRole).toHaveBeenCalledWith(
        mockServiceVisibleRoleParams
      );
      expect(mockServiceVisibleRoleService.assignServiceVisibleRole).toHaveBeenCalledTimes(1);
    });

    it('서비스에서 이미 존재하는 관계 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = ServiceVisibleRoleException.serviceVisibleRoleAlreadyExists();
      mockServiceVisibleRoleService.assignServiceVisibleRole.mockRejectedValue(mockError);

      // When & Then
      await expect(
        controller.assignServiceVisibleRole(mockServiceVisibleRoleParams)
      ).rejects.toThrow(ServiceVisibleRoleException.serviceVisibleRoleAlreadyExists());
      expect(mockServiceVisibleRoleService.assignServiceVisibleRole).toHaveBeenCalledWith(
        mockServiceVisibleRoleParams
      );
    });

    it('일반적인 서비스 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = ServiceVisibleRoleException.assignError();
      mockServiceVisibleRoleService.assignServiceVisibleRole.mockRejectedValue(mockError);

      // When & Then
      await expect(
        controller.assignServiceVisibleRole(mockServiceVisibleRoleParams)
      ).rejects.toThrow(ServiceVisibleRoleException.assignError());
      expect(mockServiceVisibleRoleService.assignServiceVisibleRole).toHaveBeenCalledWith(
        mockServiceVisibleRoleParams
      );
    });
  });

  describe('revokeServiceVisibleRole', () => {
    it('서비스-역할 해제를 성공적으로 수행해야 함', async () => {
      // Given
      mockServiceVisibleRoleService.revokeServiceVisibleRole.mockResolvedValue(undefined);

      // When
      await controller.revokeServiceVisibleRole(mockServiceVisibleRoleParams);

      // Then
      expect(mockServiceVisibleRoleService.revokeServiceVisibleRole).toHaveBeenCalledWith(
        mockServiceVisibleRoleParams
      );
      expect(mockServiceVisibleRoleService.revokeServiceVisibleRole).toHaveBeenCalledTimes(1);
    });

    it('서비스에서 관계를 찾을 수 없는 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = ServiceVisibleRoleException.serviceVisibleRoleNotFound();
      mockServiceVisibleRoleService.revokeServiceVisibleRole.mockRejectedValue(mockError);

      // When & Then
      await expect(
        controller.revokeServiceVisibleRole(mockServiceVisibleRoleParams)
      ).rejects.toThrow(ServiceVisibleRoleException.serviceVisibleRoleNotFound());
      expect(mockServiceVisibleRoleService.revokeServiceVisibleRole).toHaveBeenCalledWith(
        mockServiceVisibleRoleParams
      );
    });

    it('일반적인 서비스 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = ServiceVisibleRoleException.revokeError();
      mockServiceVisibleRoleService.revokeServiceVisibleRole.mockRejectedValue(mockError);

      // When & Then
      await expect(
        controller.revokeServiceVisibleRole(mockServiceVisibleRoleParams)
      ).rejects.toThrow(ServiceVisibleRoleException.revokeError());
      expect(mockServiceVisibleRoleService.revokeServiceVisibleRole).toHaveBeenCalledWith(
        mockServiceVisibleRoleParams
      );
    });
  });

  // ==================== 배치 처리 API 테스트 ====================

  describe('assignMultipleRoles', () => {
    it('여러 역할 할당을 성공적으로 수행해야 함', async () => {
      // Given
      mockServiceVisibleRoleService.assignMultipleRoles.mockResolvedValue(
        mockServiceVisibleRoleBatchResult
      );

      // When
      await controller.assignMultipleRoles(mockServiceIdParams, mockRoleIdsDto);

      // Then
      expect(mockServiceVisibleRoleService.assignMultipleRoles).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleIds: mockRoleIds,
      });
      expect(mockServiceVisibleRoleService.assignMultipleRoles).toHaveBeenCalledTimes(1);
    });

    it('서비스에서 배치 할당 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = ServiceVisibleRoleException.assignMultipleError();
      mockServiceVisibleRoleService.assignMultipleRoles.mockRejectedValue(mockError);

      // When & Then
      await expect(
        controller.assignMultipleRoles(mockServiceIdParams, mockRoleIdsDto)
      ).rejects.toThrow(ServiceVisibleRoleException.assignMultipleError());
      expect(mockServiceVisibleRoleService.assignMultipleRoles).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleIds: mockRoleIds,
      });
    });

    it('빈 역할 목록으로 배치 할당을 수행해야 함', async () => {
      // Given
      const emptyRolesDto: RoleIdsDto = { roleIds: [] };
      mockServiceVisibleRoleService.assignMultipleRoles.mockResolvedValue(
        mockServiceVisibleRoleBatchResult
      );

      // When
      await controller.assignMultipleRoles(mockServiceIdParams, emptyRolesDto);

      // Then
      expect(mockServiceVisibleRoleService.assignMultipleRoles).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleIds: [],
      });
    });
  });

  describe('revokeMultipleRoles', () => {
    it('여러 역할 해제를 성공적으로 수행해야 함', async () => {
      // Given
      mockServiceVisibleRoleService.revokeMultipleRoles.mockResolvedValue(undefined);

      // When
      await controller.revokeMultipleRoles(mockServiceIdParams, mockRoleIdsDto);

      // Then
      expect(mockServiceVisibleRoleService.revokeMultipleRoles).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleIds: mockRoleIds,
      });
      expect(mockServiceVisibleRoleService.revokeMultipleRoles).toHaveBeenCalledTimes(1);
    });

    it('서비스에서 배치 해제 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = ServiceVisibleRoleException.revokeMultipleError();
      mockServiceVisibleRoleService.revokeMultipleRoles.mockRejectedValue(mockError);

      // When & Then
      await expect(
        controller.revokeMultipleRoles(mockServiceIdParams, mockRoleIdsDto)
      ).rejects.toThrow(ServiceVisibleRoleException.revokeMultipleError());
      expect(mockServiceVisibleRoleService.revokeMultipleRoles).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleIds: mockRoleIds,
      });
    });

    it('빈 역할 목록으로 배치 해제를 수행해야 함', async () => {
      // Given
      const emptyRolesDto: RoleIdsDto = { roleIds: [] };
      mockServiceVisibleRoleService.revokeMultipleRoles.mockResolvedValue(undefined);

      // When
      await controller.revokeMultipleRoles(mockServiceIdParams, emptyRolesDto);

      // Then
      expect(mockServiceVisibleRoleService.revokeMultipleRoles).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleIds: [],
      });
    });
  });

  describe('replaceServiceRoles', () => {
    it('서비스의 역할을 성공적으로 교체해야 함', async () => {
      // Given
      mockServiceVisibleRoleService.replaceServiceRoles.mockResolvedValue(undefined);

      // When
      await controller.replaceServiceRoles(mockServiceIdParams, mockRoleIdsDto);

      // Then
      expect(mockServiceVisibleRoleService.replaceServiceRoles).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleIds: mockRoleIds,
      });
      expect(mockServiceVisibleRoleService.replaceServiceRoles).toHaveBeenCalledTimes(1);
    });

    it('빈 역할 목록으로 교체할 때 모든 기존 역할이 제거되어야 함', async () => {
      // Given
      const emptyRolesDto: RoleIdsDto = { roleIds: [] };
      mockServiceVisibleRoleService.replaceServiceRoles.mockResolvedValue(undefined);

      // When
      await controller.replaceServiceRoles(mockServiceIdParams, emptyRolesDto);

      // Then
      expect(mockServiceVisibleRoleService.replaceServiceRoles).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleIds: [],
      });
    });

    it('서비스에서 교체 에러 시 예외가 전파되어야 함', async () => {
      // Given
      const mockError = ServiceVisibleRoleException.replaceError();
      mockServiceVisibleRoleService.replaceServiceRoles.mockRejectedValue(mockError);

      // When & Then
      await expect(
        controller.replaceServiceRoles(mockServiceIdParams, mockRoleIdsDto)
      ).rejects.toThrow(ServiceVisibleRoleException.replaceError());
      expect(mockServiceVisibleRoleService.replaceServiceRoles).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleIds: mockRoleIds,
      });
    });

    it('새로운 역할 세트로 교체를 성공적으로 수행해야 함', async () => {
      // Given
      const newRoleIds = ['role-new-1', 'role-new-2'];
      const newRolesDto: RoleIdsDto = { roleIds: newRoleIds };
      mockServiceVisibleRoleService.replaceServiceRoles.mockResolvedValue(undefined);

      // When
      await controller.replaceServiceRoles(mockServiceIdParams, newRolesDto);

      // Then
      expect(mockServiceVisibleRoleService.replaceServiceRoles).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleIds: newRoleIds,
      });
    });
  });

  // ==================== 에지 케이스 및 통합 테스트 ====================

  describe('파라미터 검증', () => {
    it('모든 엔드포인트에서 올바른 파라미터를 서비스로 전달해야 함', async () => {
      // Given
      mockServiceVisibleRoleService.getRoleIds.mockResolvedValue([]);
      mockServiceVisibleRoleService.getServiceIds.mockResolvedValue([]);
      mockServiceVisibleRoleService.exists.mockResolvedValue(false);
      mockServiceVisibleRoleService.assignServiceVisibleRole.mockResolvedValue(undefined);
      mockServiceVisibleRoleService.revokeServiceVisibleRole.mockResolvedValue(undefined);
      mockServiceVisibleRoleService.assignMultipleRoles.mockResolvedValue(
        mockServiceVisibleRoleBatchResult
      );
      mockServiceVisibleRoleService.revokeMultipleRoles.mockResolvedValue(undefined);
      mockServiceVisibleRoleService.replaceServiceRoles.mockResolvedValue(undefined);

      // When & Then
      await controller.getRoleIdsByServiceId(mockServiceIdParams);
      expect(mockServiceVisibleRoleService.getRoleIds).toHaveBeenCalledWith(mockServiceId);

      await controller.getServiceIdsByRoleId(mockRoleIdParams);
      expect(mockServiceVisibleRoleService.getServiceIds).toHaveBeenCalledWith(mockRoleId);

      await controller.checkServiceVisibleRoleExists(mockServiceVisibleRoleParams);
      expect(mockServiceVisibleRoleService.exists).toHaveBeenCalledWith(
        mockServiceVisibleRoleParams
      );

      await controller.assignServiceVisibleRole(mockServiceVisibleRoleParams);
      expect(mockServiceVisibleRoleService.assignServiceVisibleRole).toHaveBeenCalledWith(
        mockServiceVisibleRoleParams
      );

      await controller.revokeServiceVisibleRole(mockServiceVisibleRoleParams);
      expect(mockServiceVisibleRoleService.revokeServiceVisibleRole).toHaveBeenCalledWith(
        mockServiceVisibleRoleParams
      );

      await controller.assignMultipleRoles(mockServiceIdParams, mockRoleIdsDto);
      expect(mockServiceVisibleRoleService.assignMultipleRoles).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleIds: mockRoleIds,
      });

      await controller.revokeMultipleRoles(mockServiceIdParams, mockRoleIdsDto);
      expect(mockServiceVisibleRoleService.revokeMultipleRoles).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleIds: mockRoleIds,
      });

      await controller.replaceServiceRoles(mockServiceIdParams, mockRoleIdsDto);
      expect(mockServiceVisibleRoleService.replaceServiceRoles).toHaveBeenCalledWith({
        serviceId: mockServiceId,
        roleIds: mockRoleIds,
      });
    });
  });

  describe('서비스 의존성', () => {
    it('ServiceVisibleRoleService에 대한 의존성이 올바르게 주입되어야 함', () => {
      expect(mockServiceVisibleRoleService).toBeDefined();
    });

    it('모든 서비스 메서드가 모킹되어 있어야 함', () => {
      expect(mockServiceVisibleRoleService.getRoleIds).toBeDefined();
      expect(mockServiceVisibleRoleService.getServiceIds).toBeDefined();
      expect(mockServiceVisibleRoleService.exists).toBeDefined();
      expect(mockServiceVisibleRoleService.assignServiceVisibleRole).toBeDefined();
      expect(mockServiceVisibleRoleService.revokeServiceVisibleRole).toBeDefined();
      expect(mockServiceVisibleRoleService.assignMultipleRoles).toBeDefined();
      expect(mockServiceVisibleRoleService.revokeMultipleRoles).toBeDefined();
      expect(mockServiceVisibleRoleService.replaceServiceRoles).toBeDefined();
    });
  });
});
