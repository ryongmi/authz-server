import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { UpdateResult } from 'typeorm';
import { of, throwError } from 'rxjs';

import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import type {
  RoleSearchQuery,
  RoleFilter,
  CreateRole,
  UpdateRole,
} from '@krgeobuk/role/interfaces';
import { RoleException } from '@krgeobuk/role/exception';
import type { Service } from '@krgeobuk/shared/service';
import type { User } from '@krgeobuk/shared/user';

import { UserRoleService } from '@modules/user-role/index.js';

import { RoleService } from './role.service.js';
import { RoleRepository } from './role.repository.js';
import { RoleEntity } from './entities/role.entity.js';

// UserRoleService 모킹을 위한 타입 정의
interface MockUserRoleService {
  hasUsersForRole: jest.Mock;
  getUserIds: jest.Mock;
  getRoleCountsBatch: jest.Mock;
}

describe('RoleService', () => {
  let service: RoleService;
  let roleRepo: jest.Mocked<RoleRepository>;
  let userRoleService: MockUserRoleService;
  let authClient: jest.Mocked<ClientProxy>;
  let portalClient: jest.Mocked<ClientProxy>;
  let mockLogger: jest.Mocked<Logger>;

  // 테스트 데이터
  const mockRole: RoleEntity = {
    id: 'role-123',
    name: 'Admin',
    description: 'Administrator role',
    priority: 1,
    serviceId: 'service-456',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockService: Service = {
    id: 'service-456',
    name: 'Test Service',
  };

  const mockUser: User = {
    id: 'user-789',
    email: 'admin@test.com',
    name: 'Admin User',
  };

  beforeEach(async () => {
    const mockRoleRepo = {
      findOneById: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      searchRoles: jest.fn(),
      saveEntity: jest.fn().mockResolvedValue(mockRole),
      updateEntity: jest.fn().mockResolvedValue(mockRole),
      softDelete: jest.fn(),
    };

    const mockUserRoleService: MockUserRoleService = {
      hasUsersForRole: jest.fn(),
      getUserIds: jest.fn(),
      getRoleCountsBatch: jest.fn(),
    };

    const mockAuthClient = {
      send: jest.fn(),
    };

    const mockPortalClient = {
      send: jest.fn(),
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
        RoleService,
        {
          provide: RoleRepository,
          useValue: mockRoleRepo,
        },
        {
          provide: UserRoleService,
          useValue: mockUserRoleService,
        },
        {
          provide: 'AUTH_SERVICE',
          useValue: mockAuthClient,
        },
        {
          provide: 'PORTAL_SERVICE',
          useValue: mockPortalClient,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    roleRepo = module.get(RoleRepository);
    userRoleService = module.get(UserRoleService);
    authClient = module.get('AUTH_SERVICE');
    portalClient = module.get('PORTAL_SERVICE');

    // mockLogger 인스턴스 설정
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

  describe('findById', () => {
    it('역할 ID로 역할을 조회해야 함', async () => {
      // Given
      roleRepo.findOneById.mockResolvedValue(mockRole);

      // When
      const result = await service.findById('role-123');

      // Then
      expect(result).toEqual(mockRole);
      expect(roleRepo.findOneById).toHaveBeenCalledWith('role-123');
    });

    it('존재하지 않는 역할 ID의 경우 null을 반환해야 함', async () => {
      // Given
      roleRepo.findOneById.mockResolvedValue(null);

      // When
      const result = await service.findById('non-existent');

      // Then
      expect(result).toBeNull();
      expect(roleRepo.findOneById).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('findByIdOrFail', () => {
    it('역할이 존재하면 반환해야 함', async () => {
      // Given
      roleRepo.findOneById.mockResolvedValue(mockRole);

      // When
      const result = await service.findByIdOrFail('role-123');

      // Then
      expect(result).toEqual(mockRole);
    });

    it('역할이 존재하지 않으면 RoleException을 던져야 함', async () => {
      // Given
      roleRepo.findOneById.mockResolvedValue(null);

      // When & Then
      await expect(service.findByIdOrFail('non-existent')).rejects.toThrow(
        RoleException.roleNotFound()
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('역할을 찾을 수 없음', {
        roleId: 'non-existent',
      });
    });
  });

  describe('findByIds', () => {
    it('여러 역할 ID로 역할들을 조회해야 함', async () => {
      // Given
      const roleIds = ['role-1', 'role-2'];
      const mockRoles = [mockRole, { ...mockRole, id: 'role-2' }];
      roleRepo.find.mockResolvedValue(mockRoles);

      // When
      const result = await service.findByIds(roleIds);

      // Then
      expect(result).toEqual(mockRoles);
      expect(roleRepo.find).toHaveBeenCalledWith({
        where: { id: expect.any(Object) }, // In 객체
        order: { name: 'DESC' },
      });
    });

    it('빈 배열을 입력하면 빈 배열을 반환해야 함', async () => {
      // When
      const result = await service.findByIds([]);

      // Then
      expect(result).toEqual([]);
      expect(roleRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('searchRoles', () => {
    const mockSearchQuery: RoleSearchQuery = {
      name: 'Admin',
      serviceId: 'service-456',
      page: 1,
      limit: 15,
    };

    const mockSearchResult: PaginatedResult<Partial<RoleEntity>> = {
      items: [mockRole],
      pageInfo: {
        page: 1,
        limit: 15,
        totalPages: 1,
        totalItems: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    it('검색 결과와 외부 데이터를 결합해서 반환해야 함', async () => {
      // Given
      roleRepo.searchRoles.mockResolvedValue(mockSearchResult);
      userRoleService.getRoleCountsBatch.mockResolvedValue({ 'role-123': 5 });
      portalClient.send.mockReturnValue(of([mockService]));

      // When
      const result = await service.searchRoles(mockSearchQuery);

      // Then
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: 'role-123',
        name: 'Admin',
        description: 'Administrator role',
        priority: 1,
        userCount: 5,
        service: mockService,
      });
      expect(userRoleService.getRoleCountsBatch).toHaveBeenCalledWith(['role-123']);
    });

    it('외부 서비스 통신 실패 시 폴백 데이터를 반환해야 함', async () => {
      // Given
      roleRepo.searchRoles.mockResolvedValue(mockSearchResult);
      userRoleService.getRoleCountsBatch.mockRejectedValue(new Error('Service unavailable'));
      portalClient.send.mockReturnValue(throwError(() => new Error('Service unavailable')));

      // When
      const result = await service.searchRoles(mockSearchQuery);

      // Then
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: 'role-123',
        name: 'Admin',
        description: 'Administrator role',
        priority: 1,
        userCount: 0,
        service: { id: '', name: 'Service unavailable' },
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'TCP 서비스 통신 실패, 대체 데이터 사용',
        expect.any(Object)
      );
    });

    it('검색 결과가 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      const emptyResult: PaginatedResult<Partial<RoleEntity>> = {
        items: [],
        pageInfo: mockSearchResult.pageInfo,
      };
      roleRepo.searchRoles.mockResolvedValue(emptyResult);

      // When
      const result = await service.searchRoles(mockSearchQuery);

      // Then
      expect(result.items).toEqual([]);
      expect(userRoleService.getRoleCountsBatch).not.toHaveBeenCalled();
    });
  });

  describe('getRoleById', () => {
    it('역할 상세 정보를 외부 데이터와 함께 반환해야 함', async () => {
      // Given
      roleRepo.findOneById.mockResolvedValue(mockRole);
      portalClient.send.mockReturnValue(of(mockService));
      userRoleService.getUserIds.mockResolvedValue(['user-789']);
      authClient.send.mockReturnValue(of([mockUser]));

      // When
      const result = await service.getRoleById('role-123');

      // Then
      expect(result).toEqual({
        id: 'role-123',
        name: 'Admin',
        description: 'Administrator role',
        priority: 1,
        service: mockService,
        users: [mockUser],
      });
    });

    it('외부 서비스 실패 시 기본 정보만 반환해야 함', async () => {
      // Given
      roleRepo.findOneById.mockResolvedValue(mockRole);
      portalClient.send.mockReturnValue(throwError(() => new Error('Service unavailable')));

      // When
      const result = await service.getRoleById('role-123');

      // Then
      expect(result).toEqual({
        id: 'role-123',
        name: 'Admin',
        description: 'Administrator role',
        priority: 1,
        service: { id: '', name: 'Service unavailable' },
        users: [],
      });
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('createRole', () => {
    const createDto: CreateRole = {
      name: 'New Role',
      description: 'New role description',
      priority: 2,
      serviceId: 'service-456',
    };

    it('새로운 역할을 성공적으로 생성해야 함', async () => {
      // Given
      const savedRole: RoleEntity = { ...mockRole, ...createDto };
      roleRepo.findOne.mockResolvedValue(null); // 중복 없음
      roleRepo.saveEntity.mockResolvedValue(savedRole);

      // When
      await service.createRole(createDto);

      // Then
      expect(roleRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'New Role', serviceId: 'service-456' },
      });
      expect(roleRepo.saveEntity).toHaveBeenCalledWith(
        expect.objectContaining(createDto),
        undefined
      );
      expect(mockLogger.log).toHaveBeenCalledWith('역할 생성 성공', expect.any(Object));
    });

    it('중복된 역할명이 존재하면 RoleException을 던져야 함', async () => {
      // Given
      roleRepo.findOne.mockResolvedValue(mockRole); // 중복 존재

      // When & Then
      await expect(service.createRole(createDto)).rejects.toThrow(
        RoleException.roleAlreadyExists()
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '역할 생성 실패: 서비스 내 중복 이름',
        expect.any(Object)
      );
      expect(roleRepo.saveEntity).not.toHaveBeenCalled();
    });

    it('데이터베이스 에러 발생 시 RoleException을 던져야 함', async () => {
      // Given
      roleRepo.findOne.mockResolvedValue(null);
      roleRepo.saveEntity.mockRejectedValue(new Error('DB Error'));

      // When & Then
      await expect(service.createRole(createDto)).rejects.toThrow(RoleException.roleCreateError());
      expect(mockLogger.error).toHaveBeenCalledWith('역할 생성 실패', expect.any(Object));
    });
  });

  describe('updateRole', () => {
    const updateDto: UpdateRole = {
      name: 'Updated Role',
      description: 'Updated description',
    };

    it('역할을 성공적으로 업데이트해야 함', async () => {
      // Given
      const mockUpdateResult: UpdateResult = {
        affected: 1,
        generatedMaps: [],
        raw: {},
      };
      roleRepo.findOneById.mockResolvedValue(mockRole);
      roleRepo.findOne.mockResolvedValue(null); // 이름 중복 없음
      roleRepo.updateEntity.mockResolvedValue(mockUpdateResult);

      // When
      await service.updateRole('role-123', updateDto);

      // Then
      expect(roleRepo.updateEntity).toHaveBeenCalledWith(
        expect.objectContaining({ ...mockRole, ...updateDto }),
        undefined
      );
      expect(mockLogger.log).toHaveBeenCalledWith('역할 업데이트 성공', expect.any(Object));
    });

    it('존재하지 않는 역할 업데이트 시 RoleException을 던져야 함', async () => {
      // Given
      roleRepo.findOneById.mockResolvedValue(null);

      // When & Then
      await expect(service.updateRole('non-existent', updateDto)).rejects.toThrow(
        RoleException.roleNotFound()
      );
      expect(roleRepo.updateEntity).not.toHaveBeenCalled();
    });

    it('이름 변경 시 중복 검사를 수행해야 함', async () => {
      // Given - 원본 mockRole은 변경하지 않고 새로운 객체 생성
      const originalRole: RoleEntity = {
        id: 'role-123',
        name: 'Admin', // 원래 이름
        description: 'Administrator role',
        priority: 1,
        serviceId: 'service-456',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const duplicateRole = { ...originalRole, id: 'other-role', name: 'Updated Role' };
      roleRepo.findOneById.mockResolvedValue(originalRole);
      roleRepo.findOne.mockResolvedValue(duplicateRole); // 중복 존재
      roleRepo.updateEntity.mockResolvedValue({ affected: 1, generatedMaps: [], raw: {} });

      // When & Then
      await expect(service.updateRole('role-123', updateDto)).rejects.toThrow(
        RoleException.roleAlreadyExists()
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '역할 업데이트 실패: 서비스 내 중복 이름',
        expect.any(Object)
      );
    });
  });

  describe('deleteRole', () => {
    const mockUpdateResult: UpdateResult = {
      affected: 1,
      generatedMaps: [],
      raw: {},
    };

    it('사용자가 할당되지 않은 역할을 성공적으로 삭제해야 함', async () => {
      // Given
      roleRepo.findOneById.mockResolvedValue(mockRole);
      userRoleService.hasUsersForRole.mockResolvedValue(false);
      roleRepo.softDelete.mockResolvedValue(mockUpdateResult);

      // When
      const result = await service.deleteRole('role-123');

      // Then
      expect(result).toEqual(mockUpdateResult);
      expect(userRoleService.hasUsersForRole).toHaveBeenCalledWith('role-123');
      expect(roleRepo.softDelete).toHaveBeenCalledWith('role-123');
      expect(mockLogger.log).toHaveBeenCalledWith('역할 삭제 성공', expect.any(Object));
    });

    it('사용자가 할당된 역할 삭제 시 RoleException을 던져야 함', async () => {
      // Given
      roleRepo.findOneById.mockResolvedValue(mockRole);
      userRoleService.hasUsersForRole.mockResolvedValue(true);

      // When & Then
      await expect(service.deleteRole('role-123')).rejects.toThrow(RoleException.roleDeleteError());
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '역할 삭제 실패: 역할에 할당된 사용자가 있음',
        expect.any(Object)
      );
      expect(roleRepo.softDelete).not.toHaveBeenCalled();
    });

    it('존재하지 않는 역할 삭제 시 RoleException을 던져야 함', async () => {
      // Given
      roleRepo.findOneById.mockResolvedValue(null);

      // When & Then
      await expect(service.deleteRole('non-existent')).rejects.toThrow(
        RoleException.roleNotFound()
      );
      expect(userRoleService.hasUsersForRole).not.toHaveBeenCalled();
    });
  });

  describe('findByAnd', () => {
    it('AND 조건으로 역할을 검색해야 함', async () => {
      // Given
      const filter: RoleFilter = {
        name: 'Admin',
        serviceId: 'service-456',
      };
      roleRepo.find.mockResolvedValue([mockRole]);

      // When
      const result = await service.findByAnd(filter);

      // Then
      expect(result).toEqual([mockRole]);
      expect(roleRepo.find).toHaveBeenCalledWith({
        where: {
          name: 'Admin',
          serviceId: 'service-456',
        },
      });
    });

    it('필터가 없으면 전체 역할을 조회해야 함', async () => {
      // Given
      roleRepo.find.mockResolvedValue([mockRole]);

      // When
      const result = await service.findByAnd({});

      // Then
      expect(result).toEqual([mockRole]);
      expect(roleRepo.find).toHaveBeenCalledWith();
    });
  });

  describe('findByOr', () => {
    it('OR 조건으로 역할을 검색해야 함', async () => {
      // Given
      const filter: RoleFilter = {
        name: 'Admin',
        priority: 1,
      };
      roleRepo.find.mockResolvedValue([mockRole]);

      // When
      const result = await service.findByOr(filter);

      // Then
      expect(result).toEqual([mockRole]);
      expect(roleRepo.find).toHaveBeenCalledWith({
        where: [{ name: 'Admin' }, { priority: 1 }],
      });
    });

    it('필터가 없으면 전체 역할을 조회해야 함', async () => {
      // Given
      roleRepo.find.mockResolvedValue([mockRole]);

      // When
      const result = await service.findByOr({});

      // Then
      expect(result).toEqual([mockRole]);
      expect(roleRepo.find).toHaveBeenCalledWith();
    });
  });

  describe('findByServiceIds', () => {
    it('서비스 ID들로 역할을 조회해야 함', async () => {
      // Given
      const serviceIds = ['service-1', 'service-2'];
      roleRepo.find.mockResolvedValue([mockRole]);

      // When
      const result = await service.findByServiceIds(serviceIds);

      // Then
      expect(result).toEqual([mockRole]);
      expect(roleRepo.find).toHaveBeenCalledWith({
        where: { serviceId: expect.any(Object) }, // In 객체
      });
    });
  });
});
