import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { DataSource } from 'typeorm';
import { firstValueFrom } from 'rxjs';

import { CheckPermission, CheckRole } from '@krgeobuk/authorization/interfaces';
import type { Service } from '@krgeobuk/shared/service';
import { ServiceTcpPatterns } from '@krgeobuk/service/tcp';

import { UserRoleService } from '@modules/user-role/index.js';
import { RolePermissionService } from '@modules/role-permission/index.js';
import { ServiceVisibleRoleService } from '@modules/service-visible-role/index.js';
import { PermissionService } from '@modules/permission/index.js';
import { RoleService } from '@modules/role/index.js';

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly userRoleService: UserRoleService,
    private readonly rolePermissionService: RolePermissionService,
    private readonly serviceVisibleRoleService: ServiceVisibleRoleService,
    private readonly permissionService: PermissionService,
    private readonly roleService: RoleService,
    @Inject('PORTAL_SERVICE') private readonly portalClient: ClientProxy
  ) {}

  // ==================== PUBLIC METHODS ====================

  /**
   * 사용자가 특정 권한을 가지고 있는지 확인
   *
   * @param userId - 확인할 사용자 ID
   * @param action - 권한 액션 (예: 'create', 'read', 'update', 'delete')
   * @param serviceId - 권한을 체크할 서비스 ID (옵션)
   * @returns 권한 보유 여부
   */
  async checkUserPermission(attrs: CheckPermission): Promise<boolean> {
    const { userId, action, serviceId } = attrs;

    try {
      this.logger.debug('Permission check requested', {
        userId,
        action,
        serviceId,
      });

      // 통합 쿼리를 사용한 권한 검증
      const hasPermission = await this.checkUserPermissionOptimized(userId, action, serviceId);

      if (hasPermission) {
        this.logger.debug('Permission granted', {
          userId,
          action,
          serviceId,
        });
        return true;
      }

      this.logger.debug('Permission denied', {
        userId,
        action,
        serviceId,
      });

      return false;
    } catch (error: unknown) {
      this.logger.error('Permission check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        action,
        serviceId,
      });

      // 권한 체크 실패 시 보안상 false 반환
      return false;
    }
  }

  /**
   * 통합 쿼리를 사용한 최적화된 권한 검증
   * 여러 단계의 쿼리를 하나의 복합 쿼리로 통합하여 성능 향상
   */
  private async checkUserPermissionOptimized(
    userId: string,
    action: string,
    serviceId?: string
  ): Promise<boolean> {
    // 통합 쿼리 시도 - 최고 성능
    if (serviceId) {
      const hasPermissionIntegrated = await this.checkUserPermissionIntegratedQuery(
        userId,
        action,
        serviceId
      );
      if (hasPermissionIntegrated !== null) {
        return hasPermissionIntegrated;
      }
    }

    // 폴백: 기존 방식 (서비스 ID 없거나 통합 쿼리 실패 시)
    return await this.checkUserPermissionFallback(userId, action, serviceId);
  }

  /**
   * 단일 통합 쿼리를 사용한 최고 성능 권한 검증
   * 모든 관련 테이블을 JOIN하여 한 번의 쿼리로 권한 검증
   */
  private async checkUserPermissionIntegratedQuery(
    userId: string,
    action: string,
    serviceId: string
  ): Promise<boolean | null> {
    try {
      // 통합 쿼리: user_role -> service_visible_role -> role_permission -> permission
      const result = await this.dataSource
        .createQueryBuilder()
        .select('1')
        .from('user_role', 'ur')
        .innerJoin('service_visible_role', 'svr', 'ur.role_id = svr.role_id')
        .innerJoin('role_permission', 'rp', 'ur.role_id = rp.role_id')
        .innerJoin('permission', 'p', 'rp.permission_id = p.id')
        .where('ur.user_id = :userId', { userId })
        .andWhere('svr.service_id = :serviceId', { serviceId })
        .andWhere('p.action = :action', { action })
        .andWhere('p.service_id = :serviceId', { serviceId })
        .limit(1)
        .getRawMany();

      return result.length > 0;
    } catch (error: unknown) {
      this.logger.warn('Integrated query failed, falling back to multi-step approach', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        action,
        serviceId,
      });
      return null; // 폴백 신호
    }
  }

  /**
   * 기존 방식의 다단계 권한 검증 (폴백)
   * 통합 쿼리가 실패하거나 serviceId가 없을 때 사용
   */
  private async checkUserPermissionFallback(
    userId: string,
    action: string,
    serviceId?: string
  ): Promise<boolean> {
    // 1. 병렬로 초기 데이터 조회
    const [userRoleIds, serviceVisibleRoleIds] = await Promise.all([
      this.userRoleService.getRoleIds(userId),
      serviceId ? this.serviceVisibleRoleService.getRoleIds(serviceId) : Promise.resolve(null),
    ]);

    if (userRoleIds.length === 0) {
      this.logger.debug('No roles found for user', { userId });
      return false;
    }

    // 2. 서비스별 가시성 역할 필터링
    let visibleRoleIds = userRoleIds;
    if (serviceId && serviceVisibleRoleIds) {
      visibleRoleIds = userRoleIds.filter((roleId) => serviceVisibleRoleIds.includes(roleId));

      if (visibleRoleIds.length === 0) {
        this.logger.debug('No visible roles found for service', {
          userId,
          serviceId,
          userRoleCount: userRoleIds.length,
        });
        return false;
      }
    }

    // 3. 역할별 권한 조회 및 정확한 액션 매칭
    const rolePermissionMap =
      await this.rolePermissionService.getPermissionIdsBatch(visibleRoleIds);

    // 모든 권한 ID 수집
    const allPermissionIds = new Set<string>();
    for (const permissionIds of Object.values(rolePermissionMap)) {
      permissionIds.forEach((id) => allPermissionIds.add(id));
    }

    if (allPermissionIds.size === 0) {
      this.logger.debug('No permissions found for user roles', {
        userId,
        visibleRoleIds,
      });
      return false;
    }

    const filter = {
      action: action ?? '',
      serviceId: serviceId ?? '',
    };

    // 4. Permission 서비스를 통한 정확한 액션 매칭
    const permissions = await this.permissionService.findByAnd(filter);

    // 사용자가 보유한 권한 중에서 요청한 액션과 일치하는 권한이 있는지 확인
    const hasPermission = permissions.some(
      (permission) =>
        allPermissionIds.has(permission.id) &&
        permission.action === action &&
        (!serviceId || permission.serviceId === serviceId)
    );

    return hasPermission;
  }

  /**
   * 사용자가 특정 역할을 가지고 있는지 확인
   *
   * @param userId - 확인할 사용자 ID
   * @param roleName - 역할 이름 (예: 'admin', 'manager', 'user')
   * @param serviceId - 역할을 체크할 서비스 ID (옵션)
   * @returns 역할 보유 여부
   */
  async checkUserRole(attrs: CheckRole): Promise<boolean> {
    const { userId, roleName, serviceId } = attrs;

    try {
      this.logger.debug('Role check requested', {
        userId,
        roleName,
        serviceId,
      });

      // 1. 병렬로 초기 데이터 조회
      const [userRoleIds, serviceVisibleRoleIds] = await Promise.all([
        this.userRoleService.getRoleIds(userId),
        serviceId ? this.serviceVisibleRoleService.getRoleIds(serviceId) : Promise.resolve(null),
      ]);

      if (userRoleIds.length === 0) {
        this.logger.debug('No roles found for user', { userId });
        return false;
      }

      // 2. 서비스별 가시성 역할 필터링
      let visibleRoleIds = userRoleIds;
      if (serviceId && serviceVisibleRoleIds) {
        visibleRoleIds = userRoleIds.filter((roleId) => serviceVisibleRoleIds.includes(roleId));

        if (visibleRoleIds.length === 0) {
          this.logger.debug('No visible roles found for service', {
            userId,
            serviceId,
            userRoleCount: userRoleIds.length,
          });
          return false;
        }
      }

      // 3. Role 서비스를 통한 배치 처리 역할 이름 매칭 (N+1 쿼리 해결)
      const roles = await this.roleService.findByIds(visibleRoleIds);

      // 이름 매칭 (대소문자 구분 없음)
      const hasRole = roles.some((role) => role.name.toLowerCase() === roleName.toLowerCase());

      if (hasRole) {
        this.logger.debug('Role granted', {
          userId,
          roleName,
          serviceId,
          matchingRoles: roles
            .filter((role) => role.name.toLowerCase() === roleName.toLowerCase())
            .map((role) => ({ id: role.id, name: role.name })),
        });
      } else {
        this.logger.debug('Role denied', {
          userId,
          roleName,
          serviceId,
          checkedRoles: roles.length,
          availableRoles: roles.map((role) => role.name),
        });
      }

      return hasRole;
    } catch (error: unknown) {
      this.logger.error('Role check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        roleName,
        serviceId,
      });

      // 역할 체크 실패 시 보안상 false 반환
      return false;
    }
  }

  /**
   * 사용자의 모든 권한 목록 조회
   *
   * @param userId - 사용자 ID
   * @param serviceId - 서비스 ID (옵션)
   * @returns 권한 ID 목록
   */
  async getUserPermissions(userId: string, serviceId?: string): Promise<string[]> {
    try {
      this.logger.debug('User permissions requested', { userId, serviceId });

      // 1. 병렬로 초기 데이터 조회
      const [userRoleIds, serviceVisibleRoleIds] = await Promise.all([
        this.userRoleService.getRoleIds(userId),
        serviceId ? this.serviceVisibleRoleService.getRoleIds(serviceId) : Promise.resolve(null),
      ]);

      if (userRoleIds.length === 0) {
        return [];
      }

      // 2. 서비스별 가시성 역할 필터링
      let visibleRoleIds = userRoleIds;
      if (serviceId && serviceVisibleRoleIds) {
        visibleRoleIds = userRoleIds.filter((roleId) => serviceVisibleRoleIds.includes(roleId));
      }

      // 3. 역할별 권한 조회 및 중복 제거
      const rolePermissionMap =
        await this.rolePermissionService.getPermissionIdsBatch(visibleRoleIds);
      const allPermissions = new Set<string>();

      for (const permissionIds of Object.values(rolePermissionMap)) {
        permissionIds.forEach((permissionId) => allPermissions.add(permissionId));
      }

      const permissions = Array.from(allPermissions);

      this.logger.debug('User permissions retrieved', {
        userId,
        serviceId,
        permissionCount: permissions.length,
        roleCount: visibleRoleIds.length,
      });

      return permissions;
    } catch (error: unknown) {
      this.logger.error('User permissions retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        serviceId,
      });

      return [];
    }
  }

  /**
   * 사용자의 모든 역할 목록 조회 (ID 배열)
   *
   * @param userId - 사용자 ID
   * @param serviceId - 서비스 ID (옵션)
   * @returns 역할 ID 목록
   */
  async getUserRoles(userId: string, serviceId?: string): Promise<string[]> {
    try {
      this.logger.debug('User roles requested', { userId, serviceId });

      // 1. 병렬로 초기 데이터 조회
      const [userRoleIds, serviceVisibleRoleIds] = await Promise.all([
        this.userRoleService.getRoleIds(userId),
        serviceId ? this.serviceVisibleRoleService.getRoleIds(serviceId) : Promise.resolve(null),
      ]);

      if (userRoleIds.length === 0) {
        return [];
      }

      // 2. 서비스별 가시성 역할 필터링
      let visibleRoleIds = userRoleIds;
      if (serviceId && serviceVisibleRoleIds) {
        visibleRoleIds = userRoleIds.filter((roleId) => serviceVisibleRoleIds.includes(roleId));
      }

      this.logger.debug('User roles retrieved', {
        userId,
        serviceId,
        roleCount: visibleRoleIds.length,
        totalRoleCount: userRoleIds.length,
      });

      return visibleRoleIds;
    } catch (error: unknown) {
      this.logger.error('User roles retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        serviceId,
      });

      return [];
    }
  }

  /**
   * 사용자의 모든 역할 이름 목록 조회 (Name 배열)
   *
   * @param userId - 사용자 ID
   * @param serviceId - 서비스 ID (옵션)
   * @returns 역할 이름 목록
   */
  async getUserRoleNames(userId: string, serviceId?: string): Promise<string[]> {
    try {
      this.logger.debug('User role names requested', { userId, serviceId });

      // 1. 역할 ID 목록 조회
      const roleIds = await this.getUserRoles(userId, serviceId);

      if (roleIds.length === 0) {
        return [];
      }

      // 2. 역할 엔티티 배치 조회
      const roles = await this.roleService.findByIds(roleIds);

      // 3. 역할 이름만 추출
      const roleNames = roles.map((role) => role.name);

      this.logger.debug('User role names retrieved', {
        userId,
        serviceId,
        roleNameCount: roleNames.length,
        roleNames,
      });

      return roleNames;
    } catch (error: unknown) {
      this.logger.error('User role names retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        serviceId,
      });

      return [];
    }
  }

  /**
   * 사용자의 모든 권한 액션 목록 조회 (Action 배열)
   *
   * @param userId - 사용자 ID
   * @param serviceId - 서비스 ID (옵션)
   * @returns 권한 액션 목록
   */
  async getUserPermissionActions(userId: string, serviceId?: string): Promise<string[]> {
    try {
      this.logger.debug('User permission actions requested', { userId, serviceId });

      // 1. 권한 ID 목록 조회
      const permissionIds = await this.getUserPermissions(userId, serviceId);

      if (permissionIds.length === 0) {
        return [];
      }

      // 2. 권한 엔티티 배치 조회
      const permissions = await this.permissionService.findByIds(permissionIds);

      // 3. 권한 액션만 추출 (중복 제거)
      const uniqueActions = [...new Set(permissions.map((perm) => perm.action))];

      this.logger.debug('User permission actions retrieved', {
        userId,
        serviceId,
        permissionActionCount: uniqueActions.length,
        actions: uniqueActions,
      });

      return uniqueActions;
    } catch (error: unknown) {
      this.logger.error('User permission actions retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        serviceId,
      });

      return [];
    }
  }

  // ==================== ENHANCED HELPER METHODS ====================

  /**
   * 패턴 매칭을 지원하는 권한 검증 헬퍼
   * 단일 권한 검증의 간편한 인터페이스 제공
   */
  async hasPermission(userId: string, action: string, serviceId?: string): Promise<boolean> {
    return this.checkUserPermission({ userId, action, ...(serviceId && { serviceId }) });
  }

  /**
   * 여러 권한 중 하나라도 있는지 확인 (OR 조건)
   * 배치 처리로 성능 최적화
   */
  async hasAnyPermission(userId: string, actions: string[], serviceId?: string): Promise<boolean> {
    if (actions.length === 0) return true;
    if (actions.length === 1)
      return this.hasPermission(userId, actions[0]!, serviceId ?? undefined);

    try {
      // 배치 처리를 위한 병렬 권한 체크
      const results = await Promise.all(
        actions.map((action) => this.hasPermission(userId, action, serviceId ?? undefined))
      );

      const hasAnyPermission = results.some((result) => result);

      this.logger.debug('Any permission check completed', {
        userId,
        actions,
        serviceId,
        hasAnyPermission,
        checkedCount: actions.length,
      });

      return hasAnyPermission;
    } catch (error: unknown) {
      this.logger.error('Any permission check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        actions,
        serviceId,
      });

      return false;
    }
  }

  /**
   * 모든 권한을 가지고 있는지 확인 (AND 조건)
   * 배치 처리로 성능 최적화
   */
  async hasAllPermissions(userId: string, actions: string[], serviceId?: string): Promise<boolean> {
    if (actions.length === 0) return true;
    if (actions.length === 1)
      return this.hasPermission(userId, actions[0]!, serviceId ?? undefined);

    try {
      // 배치 처리를 위한 병렬 권한 체크
      const results = await Promise.all(
        actions.map((action) => this.hasPermission(userId, action, serviceId ?? undefined))
      );

      const hasAllPermissions = results.every((result) => result);

      this.logger.debug('All permissions check completed', {
        userId,
        actions,
        serviceId,
        hasAllPermissions,
        checkedCount: actions.length,
      });

      return hasAllPermissions;
    } catch (error: unknown) {
      this.logger.error('All permissions check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        actions,
        serviceId,
      });

      return false;
    }
  }

  /**
   * 여러 역할 중 하나라도 있는지 확인 (OR 조건)
   * 배치 처리로 성능 최적화
   */
  async hasAnyRole(userId: string, roleNames: string[], serviceId?: string): Promise<boolean> {
    if (roleNames.length === 0) return true;
    if (roleNames.length === 1)
      return this.checkUserRole({
        userId,
        roleName: roleNames[0]!,
        ...(serviceId && { serviceId }),
      });

    try {
      // 배치 처리를 위한 병렬 역할 체크
      const results = await Promise.all(
        roleNames.map((roleName) =>
          this.checkUserRole({ userId, roleName, ...(serviceId && { serviceId }) })
        )
      );

      const hasAnyRole = results.some((result) => result);

      this.logger.debug('Any role check completed', {
        userId,
        roleNames,
        serviceId,
        hasAnyRole,
        checkedCount: roleNames.length,
      });

      return hasAnyRole;
    } catch (error: unknown) {
      this.logger.error('Any role check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        roleNames,
        serviceId,
      });

      return false;
    }
  }

  /**
   * 모든 역할을 가지고 있는지 확인 (AND 조건)
   * 배치 처리로 성능 최적화
   */
  async hasAllRoles(userId: string, roleNames: string[], serviceId?: string): Promise<boolean> {
    if (roleNames.length === 0) return true;
    if (roleNames.length === 1)
      return this.checkUserRole({
        userId,
        roleName: roleNames[0]!,
        ...(serviceId && { serviceId }),
      });

    try {
      // 배치 처리를 위한 병렬 역할 체크
      const results = await Promise.all(
        roleNames.map((roleName) =>
          this.checkUserRole({ userId, roleName, ...(serviceId && { serviceId }) })
        )
      );

      const hasAllRoles = results.every((result) => result);

      this.logger.debug('All roles check completed', {
        userId,
        roleNames,
        serviceId,
        hasAllRoles,
        checkedCount: roleNames.length,
      });

      return hasAllRoles;
    } catch (error: unknown) {
      this.logger.error('All roles check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        roleNames,
        serviceId,
      });

      return false;
    }
  }

  /**
   * 복합 권한 조건 검증 (권한 + 역할 조합)
   * 유연한 AND/OR 조건 지원
   */
  async checkComplexPermission(attrs: {
    userId: string;
    permissions?: string[];
    roles?: string[];
    permissionOperator?: 'AND' | 'OR';
    roleOperator?: 'AND' | 'OR';
    combinationOperator?: 'AND' | 'OR';
    serviceId?: string;
  }): Promise<boolean> {
    const {
      userId,
      permissions = [],
      roles = [],
      permissionOperator = 'AND',
      roleOperator = 'AND',
      combinationOperator = 'AND',
      serviceId,
    } = attrs;

    try {
      // 권한 체크
      let permissionResult = true;
      if (permissions.length > 0) {
        permissionResult =
          permissionOperator === 'OR'
            ? await this.hasAnyPermission(userId, permissions, serviceId)
            : await this.hasAllPermissions(userId, permissions, serviceId);
      }

      // 역할 체크
      let roleResult = true;
      if (roles.length > 0) {
        roleResult =
          roleOperator === 'OR'
            ? await this.hasAnyRole(userId, roles, serviceId)
            : await this.hasAllRoles(userId, roles, serviceId);
      }

      // 결합 조건 적용
      const finalResult =
        combinationOperator === 'OR'
          ? permissionResult || roleResult
          : permissionResult && roleResult;

      this.logger.debug('Complex permission check completed', {
        userId,
        permissions,
        roles,
        permissionOperator,
        roleOperator,
        combinationOperator,
        serviceId,
        permissionResult,
        roleResult,
        finalResult,
      });

      return finalResult;
    } catch (error: unknown) {
      this.logger.error('Complex permission check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        permissions,
        roles,
        serviceId,
      });

      return false;
    }
  }

  /**
   * 사용자가 접근 가능한 서비스 목록 조회
   * 서비스 가시성 규칙을 적용하여 필터링 (배치 처리로 성능 최적화)
   *
   * @param userId - 사용자 ID
   * @returns 접근 가능한 서비스 목록
   */
  async getAvailableServices(userId: string): Promise<Service[]> {
    try {
      this.logger.debug('Available services requested', { userId });

      // 1. 사용자의 역할 조회
      const userRoles = await this.getUserRoles(userId);

      // 2. portal-server에서 모든 서비스 목록 조회 (TCP 통신)
      const allServices = await this.getAllServices();

      // 3. 서비스 가시성 규칙 적용 (배치 처리로 최적화)
      const availableServices = await this.filterServicesByVisibilityOptimized(
        allServices,
        userRoles
      );

      this.logger.debug('Available services retrieved', {
        userId,
        userRoleCount: userRoles.length,
        totalServices: allServices.length,
        availableServices: availableServices.length,
        serviceDetails: availableServices.map((s) => ({
          id: s.id,
          name: s.name,
          isVisible: s.isVisible,
          isVisibleByRole: s.isVisibleByRole,
        })),
      });

      return availableServices;
    } catch (error: unknown) {
      this.logger.error('Available services retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });

      // 에러 발생 시 빈 배열 반환 (fallback)
      return [];
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * 모든 서비스 목록 조회 (portal-server TCP 통신)
   */
  private async getAllServices(): Promise<Service[]> {
    try {
      if (!this.portalClient) {
        this.logger.warn('Portal service client not available, using fallback data');
        return [];
      }

      const services = await firstValueFrom<Service[]>(
        this.portalClient.send(ServiceTcpPatterns.FIND_ALL, {})
      );

      this.logger.debug('Portal service에서 서비스 목록 조회 성공', {
        serviceCount: services?.length || 0,
      });

      return services || [];
    } catch (error: unknown) {
      this.logger.warn('portal-server에서 서비스 목록 조회 실패, 임시 데이터 사용', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // 폴백: 임시 데이터 반환
      return [];
    }
  }

  /**
   * 서비스 가시성 규칙에 따라 서비스 목록 필터링 (배치 처리 최적화)
   * N+1 쿼리 문제를 해결하여 성능 대폭 향상
   *
   * @param services - 전체 서비스 목록
   * @param userRoles - 사용자 역할 목록
   * @returns 필터링된 서비스 목록
   */
  private async filterServicesByVisibilityOptimized(
    services: Service[],
    userRoles: string[]
  ): Promise<Service[]> {
    try {
      // 1. 권한 기반 서비스 ID 목록 추출
      const roleBasedServiceIds = services
        .filter((s) => s.isVisible && s.isVisibleByRole && s.id)
        .map((s) => s.id!)
        .filter(Boolean);

      // 2. 배치 조회: 권한 기반 서비스들의 가시성 역할을 한 번에 조회
      let serviceRoleMap: Record<string, string[]> = {};
      if (roleBasedServiceIds.length > 0) {
        serviceRoleMap = await this.serviceVisibleRoleService.getRoleIdsBatch(roleBasedServiceIds);
      }

      // 3. 서비스 필터링 (단일 루프로 처리)
      const availableServices: Service[] = [];

      for (const service of services) {
        // 비공개 서비스 제외 (isVisible = false)
        if (!service.isVisible) {
          continue;
        }

        // 전체 공개 서비스 (isVisible = true && isVisibleByRole = false)
        if (service.isVisible && !service.isVisibleByRole) {
          availableServices.push(service);
          continue;
        }

        // 권한 기반 서비스 (isVisible = true && isVisibleByRole = true)
        if (service.isVisible && service.isVisibleByRole && service.id) {
          // 사용자에게 역할이 없으면 권한 기반 서비스는 접근 불가
          if (userRoles.length === 0) {
            continue;
          }

          // 배치 조회 결과에서 서비스 가시성 역할 확인
          const serviceVisibleRoles = serviceRoleMap[service.id] || [];

          // 서비스에 가시성 역할이 설정되어 있지 않으면 접근 불가
          if (serviceVisibleRoles.length === 0) {
            continue;
          }

          // 사용자 역할 중 하나라도 서비스 가시성 역할에 포함되어 있으면 접근 가능
          const hasRequiredRole = userRoles.some((roleId) => serviceVisibleRoles.includes(roleId));

          if (hasRequiredRole) {
            availableServices.push(service);
          }
        }
      }

      this.logger.debug('Service visibility filtering completed', {
        totalServices: services.length,
        roleBasedServices: roleBasedServiceIds.length,
        availableServices: availableServices.length,
        batchQueryUsed: roleBasedServiceIds.length > 0,
      });

      return availableServices;
    } catch (error: unknown) {
      this.logger.error('Optimized service visibility filtering failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceCount: services.length,
        userRoleCount: userRoles.length,
      });

      // 에러 발생 시 기본 로직으로 폴백
      this.logger.warn('Falling back to basic visibility filtering');
      return this.filterServicesByVisibilityBasic(services, userRoles);
    }
  }

  /**
   * 기본 서비스 가시성 필터링 (폴백용)
   * 배치 처리 실패 시 사용하는 안전한 폴백 로직
   *
   * @param services - 전체 서비스 목록
   * @param userRoles - 사용자 역할 목록
   * @returns 필터링된 서비스 목록
   */
  private filterServicesByVisibilityBasic(services: Service[], userRoles: string[]): Service[] {
    const availableServices: Service[] = [];

    for (const service of services) {
      // 비공개 서비스 제외 (isVisible = false)
      if (!service.isVisible) {
        continue;
      }

      // 전체 공개 서비스 (isVisible = true && isVisibleByRole = false)
      if (service.isVisible && !service.isVisibleByRole) {
        availableServices.push(service);
        continue;
      }

      // 권한 기반 서비스 (isVisible = true && isVisibleByRole = true)
      if (service.isVisible && service.isVisibleByRole) {
        // 사용자에게 역할이 없으면 권한 기반 서비스는 접근 불가
        if (userRoles.length === 0) {
          continue;
        }

        // 폴백: 임시로 모든 역할 사용자에게 접근 허용
        // TODO: 실제 service-visible-role 확인 로직으로 교체
        availableServices.push(service);
      }
    }

    this.logger.debug('Basic service visibility filtering completed', {
      totalServices: services.length,
      availableServices: availableServices.length,
    });

    return availableServices;
  }
}
