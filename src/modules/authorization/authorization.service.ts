import { Injectable, Logger } from '@nestjs/common';

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

      // 1. 병렬로 초기 데이터 조회
      const [userRoleIds, serviceVisibleRoleIds] = await Promise.all([
        this.userRoleService.getRoleIds(userId),
        serviceId ? this.serviceVisibleRoleService.getRoleIds(serviceId) : Promise.resolve(null)
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
      const rolePermissionMap = await this.rolePermissionService.getPermissionIdsBatch(visibleRoleIds);

      // 모든 권한 ID 수집
      const allPermissionIds = new Set<string>();
      for (const permissionIds of rolePermissionMap.values()) {
        permissionIds.forEach(id => allPermissionIds.add(id));
      }

      if (allPermissionIds.size === 0) {
        this.logger.debug('No permissions found for user roles', {
          userId,
          visibleRoleIds,
        });
        return false;
      }

      // 4. Permission 서비스를 통한 정확한 액션 매칭
      const permissions = await this.permissionService.findByAnd({
        action,
        serviceId,
      });

      // 사용자가 보유한 권한 중에서 요청한 액션과 일치하는 권한이 있는지 확인
      const hasPermission = permissions.some(permission => 
        allPermissionIds.has(permission.id) && 
        permission.action === action &&
        (!serviceId || permission.serviceId === serviceId)
      );

      if (hasPermission) {
        this.logger.debug('Permission granted', {
          userId,
          action,
          serviceId,
          matchedPermissions: permissions.map(p => p.id),
        });
        return true;
      }

      this.logger.debug('Permission denied', {
        userId,
        action,
        serviceId,
        checkedRoles: visibleRoleIds.length,
        availablePermissions: Array.from(allPermissionIds),
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
        serviceId ? this.serviceVisibleRoleService.getRoleIds(serviceId) : Promise.resolve(null)
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

      // 3. Role 서비스를 통한 정확한 역할 이름 매칭
      const roles = await Promise.all(
        visibleRoleIds.map(roleId => this.roleService.findById(roleId))
      );

      // null 값 필터링 및 이름 매칭
      const validRoles = roles.filter(role => role !== null);
      const hasRole = validRoles.some(role => 
        role.name.toLowerCase() === roleName.toLowerCase()
      );

      if (hasRole) {
        this.logger.debug('Role granted', {
          userId,
          roleName,
          serviceId,
          matchingRoles: validRoles
            .filter(role => role.name.toLowerCase() === roleName.toLowerCase())
            .map(role => ({ id: role.id, name: role.name })),
        });
      } else {
        this.logger.debug('Role denied', {
          userId,
          roleName,
          serviceId,
          checkedRoles: validRoles.length,
          availableRoles: validRoles.map(role => role.name),
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
        serviceId ? this.serviceVisibleRoleService.getRoleIds(serviceId) : Promise.resolve(null)
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
      const rolePermissionMap = await this.rolePermissionService.getPermissionIdsBatch(visibleRoleIds);
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
        serviceId ? this.serviceVisibleRoleService.getRoleIds(serviceId) : Promise.resolve(null)
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

