import { HttpException, Injectable, Logger } from '@nestjs/common';

import { In } from 'typeorm';

import { RolePermissionException } from '@krgeobuk/role-permission/exception';
import type { RolePermissionBatchAssignmentResult } from '@krgeobuk/role-permission/interfaces';

import { RolePermissionEntity } from './entities/role-permission.entity.js';
import { RolePermissionRepository } from './role-permission.repository.js';

@Injectable()
export class RolePermissionService {
  private readonly logger = new Logger(RolePermissionService.name);

  constructor(private readonly rolePermissionRepo: RolePermissionRepository) {}

  // ==================== 조회 메서드 (ID 목록 반환) ====================

  /**
   * 역할의 권한 ID 목록 조회
   */
  async getPermissionIds(roleId: string): Promise<string[]> {
    try {
      return await this.rolePermissionRepo.findPermissionIdsByRoleId(roleId);
    } catch (error: unknown) {
      this.logger.error('역할별 권한 ID 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
      });
      throw RolePermissionException.fetchError();
    }
  }

  /**
   * 권한의 역할 ID 목록 조회
   */
  async getRoleIds(permissionId: string): Promise<string[]> {
    try {
      return await this.rolePermissionRepo.findRoleIdsByPermissionId(permissionId);
    } catch (error: unknown) {
      this.logger.error('권한별 역할 ID 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionId,
      });
      throw RolePermissionException.fetchError();
    }
  }

  /**
   * 여러 역할의 권한 ID 목록 조회 (배치)
   */
  async getPermissionIdsBatch(roleIds: string[]): Promise<Map<string, string[]>> {
    try {
      return await this.rolePermissionRepo.findPermissionIdsByRoleIds(roleIds);
    } catch (error: unknown) {
      this.logger.error('역할별 권한 ID 배치 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleCount: roleIds.length,
      });
      throw RolePermissionException.fetchError();
    }
  }

  /**
   * 여러 권한의 역할 ID 목록 조회 (배치)
   */
  async getRoleIdsBatch(permissionIds: string[]): Promise<Map<string, string[]>> {
    try {
      return await this.rolePermissionRepo.findRoleIdsByPermissionIds(permissionIds);
    } catch (error: unknown) {
      this.logger.error('권한별 역할 ID 배치 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionCount: permissionIds.length,
      });
      throw RolePermissionException.fetchError();
    }
  }

  /**
   * 여러 권한의 역할 수 조회 (배치) - 성능 최적화
   */
  async getRoleCountsBatch(permissionIds: string[]): Promise<Map<string, number>> {
    try {
      const roleIdsMap = await this.rolePermissionRepo.findRoleIdsByPermissionIds(permissionIds);
      const roleCounts = new Map<string, number>();

      permissionIds.forEach((permissionId) => {
        const roleIds = roleIdsMap.get(permissionId) || [];
        roleCounts.set(permissionId, roleIds.length);
      });

      return roleCounts;
    } catch (error: unknown) {
      this.logger.error('권한별 역할 수 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionCount: permissionIds.length,
      });
      throw RolePermissionException.fetchError();
    }
  }

  /**
   * 역할-권한 관계 존재 확인
   */
  async exists(roleId: string, permissionId: string): Promise<boolean> {
    try {
      return await this.rolePermissionRepo.existsRolePermission(roleId, permissionId);
    } catch (error: unknown) {
      this.logger.error('역할-권한 관계 존재 확인 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
        permissionId,
      });
      throw RolePermissionException.fetchError();
    }
  }

  // ==================== 변경 메서드 ====================

  /**
   * 단일 역할-권한 할당
   */
  async assignRolePermission(dto: { roleId: string; permissionId: string }): Promise<void> {
    try {
      // 중복 확인
      const exists = await this.exists(dto.roleId, dto.permissionId);
      if (exists) {
        this.logger.warn('역할-권한 관계 이미 존재', {
          roleId: dto.roleId,
          permissionId: dto.permissionId,
        });
        throw RolePermissionException.rolePermissionAlreadyExists();
      }

      const entity = new RolePermissionEntity();
      Object.assign(entity, dto);

      await this.rolePermissionRepo.save(entity);

      this.logger.log('역할-권한 할당 성공', {
        roleId: dto.roleId,
        permissionId: dto.permissionId,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('역할-권한 할당 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: dto.roleId,
        permissionId: dto.permissionId,
      });

      throw RolePermissionException.assignError();
    }
  }

  /**
   * 단일 역할-권한 해제
   */
  async revokeRolePermission(roleId: string, permissionId: string): Promise<void> {
    try {
      const result = await this.rolePermissionRepo.delete({ roleId, permissionId });

      if (result.affected === 0) {
        this.logger.warn('해제할 역할-권한 관계를 찾을 수 없음', {
          roleId,
          permissionId,
        });
        throw RolePermissionException.rolePermissionNotFound();
      }

      this.logger.log('역할-권한 해제 성공', {
        roleId,
        permissionId,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('역할-권한 해제 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
        permissionId,
      });

      throw RolePermissionException.revokeError();
    }
  }

  // ==================== 변경 메서드 ====================

  /**
   * 여러 권한 할당 (배치) - 개선된 로직
   */
  async assignMultiplePermissions(dto: {
    roleId: string;
    permissionIds: string[];
  }): Promise<RolePermissionBatchAssignmentResult> {
    try {
      // 1. 기존 할당 권한 조회
      const existingPermissions = await this.getPermissionIds(dto.roleId);
      const newPermissions = dto.permissionIds.filter((id) => !existingPermissions.includes(id));
      const duplicates = dto.permissionIds.filter((id) => existingPermissions.includes(id));

      if (newPermissions.length === 0) {
        this.logger.warn('새로운 권한 할당 없음 - 모든 권한이 이미 존재', {
          roleId: dto.roleId,
          requestedCount: dto.permissionIds.length,
          duplicateCount: duplicates.length,
        });

        return {
          success: true,
          affected: 0,
          details: {
            assigned: 0,
            skipped: duplicates.length,
            duplicates,
            newAssignments: [],
            roleId: dto.roleId,
            assignedPermissions: [],
          },
        };
      }

      // 2. 새로운 권한만 할당
      const entities = newPermissions.map((permissionId) => {
        const entity = new RolePermissionEntity();
        entity.roleId = dto.roleId;
        entity.permissionId = permissionId;
        return entity;
      });

      await this.rolePermissionRepo.save(entities);

      this.logger.log('역할 다중 권한 할당 성공', {
        roleId: dto.roleId,
        assignedCount: newPermissions.length,
        skippedCount: duplicates.length,
        totalRequested: dto.permissionIds.length,
      });

      return {
        success: true,
        affected: newPermissions.length,
        details: {
          assigned: newPermissions.length,
          skipped: duplicates.length,
          duplicates,
          newAssignments: newPermissions,
          roleId: dto.roleId,
          assignedPermissions: newPermissions,
        },
      };
    } catch (error: unknown) {
      this.logger.error('역할 다중 권한 할당 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: dto.roleId,
        permissionCount: dto.permissionIds.length,
      });

      throw RolePermissionException.assignMultipleError();
    }
  }

  /**
   * 여러 권한 해제 (배치)
   */
  async revokeMultiplePermissions(dto: { roleId: string; permissionIds: string[] }): Promise<void> {
    try {
      await this.rolePermissionRepo.delete({
        roleId: dto.roleId,
        permissionId: In(dto.permissionIds),
      });

      this.logger.log('역할 다중 권한 해제 성공', {
        roleId: dto.roleId,
        permissionCount: dto.permissionIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('역할 다중 권한 해제 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: dto.roleId,
        permissionCount: dto.permissionIds.length,
      });

      throw RolePermissionException.revokeMultipleError();
    }
  }

  /**
   * 역할 권한 완전 교체 (배치)
   */
  async replaceRolePermissions(dto: { roleId: string; permissionIds: string[] }): Promise<void> {
    try {
      await this.rolePermissionRepo.manager.transaction(async (manager) => {
        // 1. 기존 권한 모두 삭제
        await manager.delete(RolePermissionEntity, { roleId: dto.roleId });

        // 2. 새로운 권한 배치 삽입
        if (dto.permissionIds.length > 0) {
          const entities = dto.permissionIds.map((permissionId) => {
            const entity = new RolePermissionEntity();
            entity.roleId = dto.roleId;
            entity.permissionId = permissionId;
            return entity;
          });

          await manager.save(RolePermissionEntity, entities);
        }
      });

      this.logger.log('역할 권한 교체 성공', {
        roleId: dto.roleId,
        newPermissionCount: dto.permissionIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('역할 권한 교체 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: dto.roleId,
        newPermissionCount: dto.permissionIds.length,
      });

      throw RolePermissionException.replaceError();
    }
  }

  /**
   * 역할에 할당된 권한 존재 확인 (성능 최적화)
   */
  async hasPermissionsForRole(roleId: string): Promise<boolean> {
    try {
      const permissionIds = await this.rolePermissionRepo.findPermissionIdsByRoleId(roleId);
      return permissionIds.length > 0;
    } catch (error: unknown) {
      this.logger.error('역할의 권한 존재 확인 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
      });
      throw RolePermissionException.fetchError();
    }
  }
}
