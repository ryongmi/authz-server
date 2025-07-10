import { Injectable, HttpException } from '@nestjs/common';

import { EntityManager, FindOptionsWhere, In, UpdateResult } from 'typeorm';

import { PermissionException } from '@krgeobuk/permission/exception';
import type { PermissionFilter } from '@krgeobuk/permission/interfaces';
import type { PaginatedResult } from '@krgeobuk/core/interfaces';

import { PermissionEntity } from './entities/permission.entity.js';
import { PermissionRepository } from './permission.repository.js';
import {
  PermissionSearchQueryDto,
  CreatePermissionDto,
  UpdatePermissionDto,
} from '@krgeobuk/permission/dtos';

@Injectable()
export class PermissionService {
  constructor(
    // private readonly dataSource: DataSource,
    private readonly permissionRepo: PermissionRepository
  ) {}

  async searchPermissions(
    query: PermissionSearchQueryDto
  ): Promise<PaginatedResult<PermissionEntity>> {
    return this.permissionRepo.searchPermissions(query);
  }

  async findById(id: string): Promise<PermissionEntity | null> {
    return this.permissionRepo.findOneById(id);
  }

  async findByIdOrFail(id: string): Promise<PermissionEntity> {
    const permission = await this.permissionRepo.findOneById(id);

    if (!permission) {
      throw PermissionException.permissionNotFound();
    }

    return permission;
  }

  async findByServiceIds(serviceIds: string[]): Promise<PermissionEntity[]> {
    return this.permissionRepo.find({ where: { serviceId: In(serviceIds) } });
  }

  async findByAnd(filter: PermissionFilter = {}): Promise<PermissionEntity[]> {
    const where: FindOptionsWhere<PermissionEntity> = {};

    if (filter.action) where.action = filter.action;
    if (filter.description) where.description = filter.description;
    if (filter.serviceId) where.serviceId = filter.serviceId;

    // ✅ 필터 없으면 전체 조회
    if (Object.keys(where).length === 0) {
      return this.permissionRepo.find(); // 조건 없이 전체 조회
    }

    return this.permissionRepo.find({ where });
  }

  async findByOr(filter: PermissionFilter = {}): Promise<PermissionEntity[]> {
    const { action, description, serviceId } = filter;

    const where: FindOptionsWhere<PermissionEntity>[] = [];

    if (action) where.push({ action });
    if (description) where.push({ description });
    if (serviceId) where.push({ serviceId });

    // ✅ 필터 없으면 전체 조회
    if (where.length === 0) {
      return this.permissionRepo.find(); // 조건 없이 전체 조회
    }

    return this.permissionRepo.find({ where });
  }

  // async getRolesWithService(): Promise<RoleWithServiceDto[]> {
  //   const [roles, services] = await Promise.all([
  //     this.roleRepo.find(), // 역할 목록
  //     this.serviceManager.find(), // 서비스 목록
  //   ]);

  //   const serviceMap = new Map(services.map((s) => [s.id, s]));

  //   return roles.map((role) => ({
  //     id: role.id,
  //     name: role.name,
  //     priority: role.priority,
  //     service: serviceMap.get(role.serviceId),
  //   }));
  // }

  async createPermission(
    dto: CreatePermissionDto,
    transactionManager?: EntityManager
  ): Promise<PermissionEntity> {
    try {
      const permissionEntity = new PermissionEntity();

      Object.assign(permissionEntity, dto);

      return await this.permissionRepo.saveEntity(permissionEntity, transactionManager);
    } catch (error) {
      // 중복 키 에러나 다른 DB 에러 처리
      throw PermissionException.permissionCreateError();
    }
  }

  async updatePermission(
    id: string,
    dto: UpdatePermissionDto,
    transactionManager?: EntityManager
  ): Promise<PermissionEntity> {
    try {
      const permission = await this.findByIdOrFail(id);

      Object.assign(permission, dto);

      await this.permissionRepo.updateEntity(permission, transactionManager);

      return permission;
    } catch (error) {
      // findByIdOrFail에서 발생한 HttpException은 그대로 전파
      if (error instanceof HttpException) {
        throw error;
      }

      // 다른 DB 에러는 업데이트 에러로 처리
      throw PermissionException.permissionUpdateError();
    }
  }

  async deletePermission(id: string): Promise<UpdateResult> {
    try {
      // 권한 존재 여부 확인
      await this.findByIdOrFail(id);

      return await this.permissionRepo.softDelete(id);
    } catch (error) {
      // findByIdOrFail에서 발생한 HttpException은 그대로 전파
      if (error instanceof HttpException) {
        throw error;
      }

      // 다른 DB 에러는 삭제 에러로 처리
      throw PermissionException.permissionDeleteError();
    }
  }
}

