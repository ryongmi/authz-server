import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { CustomLogger } from '@krgeobuk/core/logger';
import {
  AssignRolePermissionDto,
  AssignMultiplePermissionsDto,
  RevokeMultiplePermissionsDto,
  ReplaceRolePermissionsDto,
} from '@krgeobuk/authz-relations/role-permission/dtos';
import { RolePermissionException } from '@krgeobuk/authz-relations/role-permission/exception';

import { RolePermissionEntity } from './entities/role-permission.entity.js';
import { RolePermissionRepository } from './role-permission.repository.js';

@Injectable()
export class RolePermissionService {
  private readonly logger = new CustomLogger(RolePermissionService.name);

  constructor(private readonly rolePermissionRepo: RolePermissionRepository) {}

  // ==================== 조회 메서드 (ID 목록 반환) ====================

  /**
   * 역할의 권한 ID 목록 조회
   */
  async findPermissionIdsByRoleId(roleId: string): Promise<string[]> {
    try {
      return await this.rolePermissionRepo.findPermissionIdsByRoleId(roleId);
    } catch (error: unknown) {
      this.logger.error('Permission IDs fetch by role failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
      });
      throw RolePermissionException.fetchError();
    }
  }

  /**
   * 권한의 역할 ID 목록 조회
   */
  async findRoleIdsByPermissionId(permissionId: string): Promise<string[]> {
    try {
      return await this.rolePermissionRepo.findRoleIdsByPermissionId(permissionId);
    } catch (error: unknown) {
      this.logger.error('Role IDs fetch by permission failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionId,
      });
      throw RolePermissionException.fetchError();
    }
  }

  /**
   * 여러 역할의 권한 ID 목록 조회 (배치)
   */
  async findPermissionIdsByRoleIds(roleIds: string[]): Promise<Map<string, string[]>> {
    try {
      return await this.rolePermissionRepo.findPermissionIdsByRoleIds(roleIds);
    } catch (error: unknown) {
      this.logger.error('Permission IDs fetch by roles failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleCount: roleIds.length,
      });
      throw RolePermissionException.fetchError();
    }
  }

  /**
   * 역할-권한 관계 존재 확인
   */
  async existsRolePermission(roleId: string, permissionId: string): Promise<boolean> {
    try {
      return await this.rolePermissionRepo.existsRolePermission(roleId, permissionId);
    } catch (error: unknown) {
      this.logger.error('Role permission existence check failed', {
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
  async assignRolePermission(dto: AssignRolePermissionDto): Promise<void> {
    try {
      // 중복 확인
      const exists = await this.existsRolePermission(dto.roleId, dto.permissionId);
      if (exists) {
        this.logger.warn('Role permission already assigned', {
          roleId: dto.roleId,
          permissionId: dto.permissionId,
        });
        throw RolePermissionException.alreadyAssigned();
      }

      const entity = new RolePermissionEntity();
      Object.assign(entity, dto);

      await this.rolePermissionRepo.save(entity);

      this.logger.log('Role permission assigned successfully', {
        roleId: dto.roleId,
        permissionId: dto.permissionId,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'HttpException') {
        throw error;
      }

      this.logger.error('Role permission assignment failed', {
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
        this.logger.warn('Role permission not found for revocation', {
          roleId,
          permissionId,
        });
        throw RolePermissionException.notAssigned();
      }

      this.logger.log('Role permission revoked successfully', {
        roleId,
        permissionId,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'HttpException') {
        throw error;
      }

      this.logger.error('Role permission revocation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
        permissionId,
      });

      throw RolePermissionException.revokeError();
    }
  }

  // ==================== 배치 처리 메서드 ====================

  /**
   * 여러 권한 할당 (배치)
   */
  async assignMultiplePermissions(dto: AssignMultiplePermissionsDto): Promise<void> {
    try {
      const entities = dto.permissionIds.map((permissionId) => {
        const entity = new RolePermissionEntity();
        entity.roleId = dto.roleId;
        entity.permissionId = permissionId;
        return entity;
      });

      // 배치 삽입 (중복 시 무시)
      await this.rolePermissionRepo
        .createQueryBuilder()
        .insert()
        .into(RolePermissionEntity)
        .values(entities)
        .orIgnore() // MySQL: ON DUPLICATE KEY UPDATE (무시)
        .execute();

      this.logger.log('Multiple permissions assigned successfully', {
        roleId: dto.roleId,
        permissionCount: dto.permissionIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('Multiple permissions assignment failed', {
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
  async revokeMultiplePermissions(dto: RevokeMultiplePermissionsDto): Promise<void> {
    try {
      await this.rolePermissionRepo.delete({
        roleId: dto.roleId,
        permissionId: In(dto.permissionIds),
      });

      this.logger.log('Multiple permissions revoked successfully', {
        roleId: dto.roleId,
        permissionCount: dto.permissionIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('Multiple permissions revocation failed', {
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
  async replaceRolePermissions(dto: ReplaceRolePermissionsDto): Promise<void> {
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

      this.logger.log('Role permissions replaced successfully', {
        roleId: dto.roleId,
        newPermissionCount: dto.permissionIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('Role permissions replacement failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: dto.roleId,
        newPermissionCount: dto.permissionIds.length,
      });

      throw RolePermissionException.replaceError();
    }
  }
}
