import { Injectable } from '@nestjs/common';

import { EntityManager, FindOptionsWhere, In, UpdateResult } from 'typeorm';

import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import { CustomLogger } from '@krgeobuk/core/logger';
import { 
  AssignRolePermissionDto,
  AssignMultiplePermissionsDto, 
  RevokeMultiplePermissionsDto, 
  ReplaceRolePermissionsDto, 
  RolePermissionDetailDto,
  RolePermissionSearchQueryDto
} from '@krgeobuk/authz-relations/role-permission/dtos';
import { RolePermissionException } from '@krgeobuk/authz-relations/role-permission/exception';

import { RolePermissionEntity } from './entities/role-permission.entity.js';
import { RolePermissionRepository } from './role-permission.repository.js';

interface Filter {
  roleId?: string;
  permissionId?: string;
}

@Injectable()
export class RolePermissionService {
  private readonly logger = new CustomLogger(RolePermissionService.name);

  constructor(
    // private readonly dataSource: DataSource,
    private readonly rolePermissionRepo: RolePermissionRepository
  ) {}

  async searchRolePermissions(query: RolePermissionSearchQueryDto): Promise<PaginatedResult<RolePermissionEntity>> {
    return this.rolePermissionRepo.searchRolePermissions(query);
  }

  async findByPermissionId(permissionId: string): Promise<RolePermissionEntity[]> {
    return this.rolePermissionRepo.find({ where: { permissionId } });
  }

  async findByRoleId(roleId: string): Promise<RolePermissionEntity[]> {
    return this.rolePermissionRepo.find({ where: { roleId } });
  }

  async findByPermissionIds(permissionIds: string[]): Promise<RolePermissionEntity[]> {
    return this.rolePermissionRepo.find({ where: { permissionId: In(permissionIds) } });
  }

  async findByRoleIds(roleIds: string[]): Promise<RolePermissionEntity[]> {
    return this.rolePermissionRepo.find({ where: { roleId: In(roleIds) } });
  }

  async findByAnd(filter: Filter = {}): Promise<RolePermissionEntity[]> {
    const where: FindOptionsWhere<RolePermissionEntity> = {};

    if (filter.permissionId) where.permissionId = filter.permissionId;
    if (filter.roleId) where.roleId = filter.roleId;

    // ✅ 필터 없으면 전체 조회
    if (Object.keys(where).length === 0) {
      return this.rolePermissionRepo.find(); // 조건 없이 전체 조회
    }

    return this.rolePermissionRepo.find({ where });
  }

  async findByOr(filter: Filter = {}): Promise<RolePermissionEntity[]> {
    const { permissionId, roleId } = filter;

    const where: FindOptionsWhere<RolePermissionEntity>[] = [];

    if (permissionId) where.push({ permissionId });
    if (roleId) where.push({ roleId });

    // ✅ 필터 없으면 전체 조회
    if (where.length === 0) {
      return this.rolePermissionRepo.find(); // 조건 없이 전체 조회
    }

    return this.rolePermissionRepo.find({ where });
  }

  async assignRolePermission(
    dto: AssignRolePermissionDto,
    transactionManager?: EntityManager
  ): Promise<RolePermissionEntity> {
    try {
      // 이미 할당된 권한인지 확인
      const existing = await this.rolePermissionRepo.findOne({
        where: { roleId: dto.roleId, permissionId: dto.permissionId }
      });

      if (existing) {
        this.logger.warn('Role permission already assigned', {
          roleId: dto.roleId,
          permissionId: dto.permissionId,
        });
        throw RolePermissionException.alreadyAssigned();
      }

      const rolePermissionEntity = new RolePermissionEntity();
      Object.assign(rolePermissionEntity, dto);

      const result = await this.rolePermissionRepo.saveEntity(rolePermissionEntity, transactionManager);
      
      this.logger.log('Role permission assigned successfully', {
        roleId: dto.roleId,
        permissionId: dto.permissionId,
      });
      
      return result;
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

  async removeRolePermission(
    roleId: string, 
    permissionId: string,
    transactionManager?: EntityManager
  ): Promise<void> {
    try {
      const rolePermission = await this.rolePermissionRepo.findOne({
        where: { roleId, permissionId }
      });

      if (!rolePermission) {
        this.logger.warn('Role permission not found for removal', {
          roleId,
          permissionId,
        });
        throw RolePermissionException.notAssigned();
      }

      await this.rolePermissionRepo.remove(rolePermission);
      
      this.logger.log('Role permission removed successfully', {
        roleId,
        permissionId,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'HttpException') {
        throw error;
      }
      
      this.logger.error('Role permission removal failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
        permissionId,
      });
      
      throw RolePermissionException.revokeError();
    }
  }

  // ==================== BATCH PROCESSING METHODS ====================

  async assignMultiplePermissions(
    dto: AssignMultiplePermissionsDto
  ): Promise<RolePermissionDetailDto[]> {
    try {
      const results: RolePermissionDetailDto[] = [];
      
      for (const permissionId of dto.permissionIds) {
        const assignDto = new AssignRolePermissionDto();
        assignDto.roleId = dto.roleId;
        assignDto.permissionId = permissionId;
        
        const result = await this.assignRolePermission(assignDto);
        results.push({
          roleId: result.roleId,
          permissionId: result.permissionId,
        });
      }
      
      this.logger.log('Multiple permissions assigned successfully', {
        roleId: dto.roleId,
        permissionCount: dto.permissionIds.length,
      });
      
      return results;
    } catch (error: unknown) {
      this.logger.error('Multiple permissions assignment failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: dto.roleId,
        permissionCount: dto.permissionIds.length,
      });
      
      throw RolePermissionException.assignMultipleError();
    }
  }

  async revokeMultiplePermissions(
    dto: RevokeMultiplePermissionsDto
  ): Promise<void> {
    try {
      for (const permissionId of dto.permissionIds) {
        await this.removeRolePermission(dto.roleId, permissionId);
      }
      
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

  async replaceRolePermissions(
    dto: ReplaceRolePermissionsDto
  ): Promise<RolePermissionDetailDto[]> {
    try {
      // 1. 기존 권한 모두 제거
      const existingPermissions = await this.findByRoleId(dto.roleId);
      for (const permission of existingPermissions) {
        await this.removeRolePermission(dto.roleId, permission.permissionId);
      }
      
      // 2. 새로운 권한 할당
      const results: RolePermissionDetailDto[] = [];
      for (const permissionId of dto.permissionIds) {
        const assignDto = new AssignRolePermissionDto();
        assignDto.roleId = dto.roleId;
        assignDto.permissionId = permissionId;
        
        const result = await this.assignRolePermission(assignDto);
        results.push({
          roleId: result.roleId,
          permissionId: result.permissionId,
        });
      }
      
      this.logger.log('Role permissions replaced successfully', {
        roleId: dto.roleId,
        oldPermissionCount: existingPermissions.length,
        newPermissionCount: dto.permissionIds.length,
      });
      
      return results;
    } catch (error: unknown) {
      this.logger.error('Role permissions replacement failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: dto.roleId,
        newPermissionCount: dto.permissionIds.length,
      });
      
      throw RolePermissionException.replaceError();
    }
  }

  // ==================== QUERY METHODS ====================

  async findPermissionIdsByRoleId(roleId: string): Promise<string[]> {
    try {
      const rolePermissions = await this.findByRoleId(roleId);
      return rolePermissions.map(rp => rp.permissionId);
    } catch (error: unknown) {
      this.logger.error('Permission IDs fetch by role failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
      });
      
      throw RolePermissionException.fetchError();
    }
  }

  async findRoleIdsByPermissionId(permissionId: string): Promise<string[]> {
    try {
      const rolePermissions = await this.findByPermissionId(permissionId);
      return rolePermissions.map(rp => rp.roleId);
    } catch (error: unknown) {
      this.logger.error('Role IDs fetch by permission failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionId,
      });
      
      throw RolePermissionException.fetchError();
    }
  }

  async existsRolePermission(roleId: string, permissionId: string): Promise<boolean> {
    try {
      const rolePermission = await this.rolePermissionRepo.findOne({
        where: { roleId, permissionId }
      });
      
      return rolePermission !== null;
    } catch (error: unknown) {
      this.logger.error('Role permission existence check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
        permissionId,
      });
      
      throw RolePermissionException.fetchError();
    }
  }
}
