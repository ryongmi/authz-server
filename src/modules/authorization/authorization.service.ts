import { Injectable, Logger } from '@nestjs/common';

import { DataSource } from 'typeorm';

import { CheckPermission, CheckRole } from '@krgeobuk/authorization/interfaces';

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
    private readonly roleService: RoleService
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
    for (const permissionIds of rolePermissionMap.values()) {
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

      for (const permissionIds of rolePermissionMap.values()) {
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
   * 사용자의 모든 역할 목록 조회
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
}

