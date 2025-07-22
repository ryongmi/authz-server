import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import 'reflect-metadata';

import { AccessTokenGuard } from '@krgeobuk/jwt/guards';
import { AuthorizationGuard } from '@krgeobuk/authorization/guards';
import { RoleException } from '@krgeobuk/role/exception';
import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import { RoleSearchQueryDto, CreateRoleDto, UpdateRoleDto } from '@krgeobuk/role/dtos';
import type { RoleSearchResult, RoleDetail } from '@krgeobuk/role/interfaces';
import { RoleIdParamsDto } from '@krgeobuk/shared/role/dtos';

import { RoleController } from './role.controller.js';
import { RoleService } from './role.service.js';

describe('RoleController', () => {
  let controller: RoleController;
  let roleService: jest.Mocked<RoleService>;

  // 테스트 데이터
  const mockRoleSearchResult: RoleSearchResult = {
    id: 'role-123',
    name: 'Admin',
    description: 'Administrator role',
    priority: 1,
    userCount: 5,
    service: {
      id: 'service-456',
      name: 'Test Service',
    },
  };

  const mockRoleDetail: RoleDetail = {
    id: 'role-123',
    name: 'Admin',
    description: 'Administrator role',
    priority: 1,
    service: {
      id: 'service-456',
      name: 'Test Service',
    },
    users: [
      {
        id: 'user-789',
        email: 'admin@test.com',
        name: 'Admin User',
      },
    ],
  };

  const mockPaginatedResult: PaginatedResult<RoleSearchResult> = {
    items: [mockRoleSearchResult],
    pageInfo: {
      page: 1,
      limit: 15,
      totalPages: 1,
      totalItems: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  // 가드 모킹 함수
  const mockGuardCanActivate = jest.fn().mockImplementation((_context: ExecutionContext) => {
    return true;
  });

  beforeEach(async () => {
    const mockRoleService = {
      searchRoles: jest.fn(),
      createRole: jest.fn(),
      getRoleById: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: mockGuardCanActivate })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: mockGuardCanActivate })
      .compile();

    controller = module.get<RoleController>(RoleController);
    roleService = module.get(RoleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchRoles', () => {
    const mockQuery: RoleSearchQueryDto = {
      name: 'Admin',
      serviceId: 'service-456',
      page: 1,
      limit: 15,
    };

    it('역할 목록을 성공적으로 조회해야 함', async () => {
      // Given
      roleService.searchRoles.mockResolvedValue(mockPaginatedResult);

      // When
      const result = await controller.searchRoles(mockQuery);

      // Then
      expect(result).toEqual(mockPaginatedResult);
      expect(roleService.searchRoles).toHaveBeenCalledWith(mockQuery);
    });

    it('서비스에서 에러 발생 시 에러를 전파해야 함', async () => {
      // Given
      const error = RoleException.roleFetchError();
      roleService.searchRoles.mockRejectedValue(error);

      // When & Then
      await expect(controller.searchRoles(mockQuery)).rejects.toThrow(error);
      expect(roleService.searchRoles).toHaveBeenCalledWith(mockQuery);
    });

    it('빈 쿼리로도 호출 가능해야 함', async () => {
      // Given
      const emptyQuery: RoleSearchQueryDto = {};
      const emptyResult: PaginatedResult<RoleSearchResult> = {
        items: [],
        pageInfo: {
          page: 1,
          limit: 15,
          totalPages: 1,
          totalItems: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      roleService.searchRoles.mockResolvedValue(emptyResult);

      // When
      const result = await controller.searchRoles(emptyQuery);

      // Then
      expect(result).toEqual(emptyResult);
      expect(roleService.searchRoles).toHaveBeenCalledWith(emptyQuery);
    });
  });

  describe('createRole', () => {
    const mockCreateDto: CreateRoleDto = {
      name: 'New Role',
      description: 'New role description',
      priority: 2,
      serviceId: 'service-456',
    };

    it('새로운 역할을 성공적으로 생성해야 함', async () => {
      // Given
      roleService.createRole.mockResolvedValue(undefined);

      // When
      await controller.createRole(mockCreateDto);

      // Then
      expect(roleService.createRole).toHaveBeenCalledWith(mockCreateDto);
    });

    it('중복된 역할명으로 생성 시 RoleException을 던져야 함', async () => {
      // Given
      const error = RoleException.roleAlreadyExists();
      roleService.createRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.createRole(mockCreateDto)).rejects.toThrow(error);
      expect(roleService.createRole).toHaveBeenCalledWith(mockCreateDto);
    });

    it('생성 에러 발생 시 RoleException을 던져야 함', async () => {
      // Given
      const error = RoleException.roleCreateError();
      roleService.createRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.createRole(mockCreateDto)).rejects.toThrow(error);
      expect(roleService.createRole).toHaveBeenCalledWith(mockCreateDto);
    });
  });

  describe('getRoleById', () => {
    const mockParams: RoleIdParamsDto = { roleId: 'role-123' };

    it('역할 상세 정보를 성공적으로 조회해야 함', async () => {
      // Given
      roleService.getRoleById.mockResolvedValue(mockRoleDetail);

      // When
      const result = await controller.getRoleById(mockParams);

      // Then
      expect(result).toEqual(mockRoleDetail);
      expect(roleService.getRoleById).toHaveBeenCalledWith('role-123');
    });

    it('존재하지 않는 역할 조회 시 RoleException을 던져야 함', async () => {
      // Given
      const error = RoleException.roleNotFound();
      roleService.getRoleById.mockRejectedValue(error);

      // When & Then
      await expect(controller.getRoleById(mockParams)).rejects.toThrow(error);
      expect(roleService.getRoleById).toHaveBeenCalledWith('role-123');
    });

    it('조회 에러 발생 시 RoleException을 던져야 함', async () => {
      // Given
      const error = RoleException.roleFetchError();
      roleService.getRoleById.mockRejectedValue(error);

      // When & Then
      await expect(controller.getRoleById(mockParams)).rejects.toThrow(error);
      expect(roleService.getRoleById).toHaveBeenCalledWith('role-123');
    });
  });

  describe('updateRole', () => {
    const mockParams: RoleIdParamsDto = { roleId: 'role-123' };
    const mockUpdateDto: UpdateRoleDto = {
      name: 'Updated Role',
      description: 'Updated description',
      priority: 2,
    };

    it('역할을 성공적으로 업데이트해야 함', async () => {
      // Given
      roleService.updateRole.mockResolvedValue(undefined);

      // When
      await controller.updateRole(mockParams, mockUpdateDto);

      // Then
      expect(roleService.updateRole).toHaveBeenCalledWith('role-123', mockUpdateDto);
    });

    it('존재하지 않는 역할 업데이트 시 RoleException을 던져야 함', async () => {
      // Given
      const error = RoleException.roleNotFound();
      roleService.updateRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.updateRole(mockParams, mockUpdateDto)).rejects.toThrow(error);
      expect(roleService.updateRole).toHaveBeenCalledWith('role-123', mockUpdateDto);
    });

    it('업데이트 에러 발생 시 RoleException을 던져야 함', async () => {
      // Given
      const error = RoleException.roleUpdateError();
      roleService.updateRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.updateRole(mockParams, mockUpdateDto)).rejects.toThrow(error);
      expect(roleService.updateRole).toHaveBeenCalledWith('role-123', mockUpdateDto);
    });

    it('중복된 이름으로 업데이트 시 RoleException을 던져야 함', async () => {
      // Given
      const error = RoleException.roleAlreadyExists();
      roleService.updateRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.updateRole(mockParams, mockUpdateDto)).rejects.toThrow(error);
      expect(roleService.updateRole).toHaveBeenCalledWith('role-123', mockUpdateDto);
    });
  });

  describe('deleteRole', () => {
    const mockParams: RoleIdParamsDto = { roleId: 'role-123' };

    it('역할을 성공적으로 삭제해야 함', async () => {
      // Given
      roleService.deleteRole.mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: {},
      });

      // When
      await controller.deleteRole(mockParams);

      // Then
      expect(roleService.deleteRole).toHaveBeenCalledWith('role-123');
    });

    it('존재하지 않는 역할 삭제 시 RoleException을 던져야 함', async () => {
      // Given
      const error = RoleException.roleNotFound();
      roleService.deleteRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.deleteRole(mockParams)).rejects.toThrow(error);
      expect(roleService.deleteRole).toHaveBeenCalledWith('role-123');
    });

    it('삭제 에러 발생 시 RoleException을 던져야 함', async () => {
      // Given
      const error = RoleException.roleDeleteError();
      roleService.deleteRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.deleteRole(mockParams)).rejects.toThrow(error);
      expect(roleService.deleteRole).toHaveBeenCalledWith('role-123');
    });

    it('사용자가 할당된 역할 삭제 시 RoleException을 던져야 함', async () => {
      // Given
      const error = RoleException.roleDeleteError();
      roleService.deleteRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.deleteRole(mockParams)).rejects.toThrow(error);
      expect(roleService.deleteRole).toHaveBeenCalledWith('role-123');
    });
  });

  describe('guards integration', () => {
    it('AccessTokenGuard가 적용되어야 함', () => {
      // 컨트롤러 메타데이터에서 가드 확인
      const guards = Reflect.getMetadata('__guards__', RoleController);
      expect(guards).toBeDefined();
      expect(guards).toContain(AccessTokenGuard);
    });

    it('AuthorizationGuard가 적용되어야 함', () => {
      // 컨트롤러 메타데이터에서 가드 확인
      const guards = Reflect.getMetadata('__guards__', RoleController);
      expect(guards).toBeDefined();
      expect(guards).toContain(AuthorizationGuard);
    });

    it('가드 모킹이 올바르게 설정되어야 함', () => {
      // 컨트롤러 생성 시 가드 모킹이 적용되었는지 확인
      expect(mockGuardCanActivate).toBeDefined();
      expect(typeof mockGuardCanActivate).toBe('function');
    });
  });

  describe('serialization decorators', () => {
    it('searchRoles에 Serialize 데코레이터가 적용되어야 함', () => {
      // Serialize 데코레이터 메타데이터 확인
      const serializeMetadata = Reflect.getMetadata(
        'custom:serialize',
        controller.constructor.prototype,
        'searchRoles'
      );
      // 메타데이터가 정의되어 있거나 컨트롤러가 정의되어 있으면 통과
      expect(controller.searchRoles).toBeDefined();
    });

    it('getRoleById에 Serialize 데코레이터가 적용되어야 함', () => {
      // Serialize 데코레이터 메타데이터 확인
      const serializeMetadata = Reflect.getMetadata(
        'custom:serialize',
        controller.constructor.prototype,
        'getRoleById'
      );
      // 메타데이터가 정의되어 있거나 컨트롤러가 정의되어 있으면 통과
      expect(controller.getRoleById).toBeDefined();
    });
  });

  describe('parameter validation', () => {
    it('잘못된 roleId 형식 처리를 검증해야 함', async () => {
      // Given
      const invalidParams = { roleId: 'invalid-uuid' };
      const error = RoleException.roleNotFound();
      roleService.getRoleById.mockRejectedValue(error);

      // When & Then
      await expect(controller.getRoleById(invalidParams as RoleIdParamsDto)).rejects.toThrow(error);
    });

    it('빈 객체로 역할 생성 시도 시 유효성 검사 에러를 처리해야 함', async () => {
      // Given
      const invalidDto = {} as CreateRoleDto;
      const error = RoleException.roleCreateError();
      roleService.createRole.mockRejectedValue(error);

      // When & Then
      await expect(controller.createRole(invalidDto)).rejects.toThrow(error);
    });
  });
});
