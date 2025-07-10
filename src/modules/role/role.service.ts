import { Injectable, HttpException } from '@nestjs/common';

import { DataSource, EntityManager, FindOptionsWhere, In, UpdateResult } from 'typeorm';

import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import { RoleException } from '@krgeobuk/role/exception';

import { RoleEntity } from './entities/role.entity.js';
import { RoleRepository } from './role.repository.js';
import { RoleSearchQueryDto } from './dtos/role-search-query.dto.js';

interface RoleFilter {
  name?: string;
  description?: string;
  priority?: number;
  serviceId?: string;
}

@Injectable()
export class RoleService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly roleRepo: RoleRepository
  ) {}

  async searchRoles(query: RoleSearchQueryDto): Promise<PaginatedResult<RoleEntity>> {
    return this.roleRepo.searchRoles(query);
  }

  async findById(id: string): Promise<RoleEntity | null> {
    return this.roleRepo.findOneById(id);
  }

  async findByIdOrFail(id: string): Promise<RoleEntity> {
    const role = await this.roleRepo.findOneById(id);
    
    if (!role) {
      throw RoleException.roleNotFound();
    }
    
    return role;
  }

  async findByServiceIds(serviceIds: string[]): Promise<RoleEntity[]> {
    return this.roleRepo.find({ where: { serviceId: In(serviceIds) } });
  }

  async findByAnd(filter: RoleFilter = {}): Promise<RoleEntity[]> {
    const where: FindOptionsWhere<RoleEntity> = {};

    if (filter.name) where.name = filter.name;
    if (filter.description) where.description = filter.description;
    if (filter.priority) where.priority = filter.priority;
    if (filter.serviceId) where.serviceId = filter.serviceId;

    // ✅ 필터 없으면 전체 조회
    if (Object.keys(where).length === 0) {
      return this.roleRepo.find(); // 조건 없이 전체 조회
    }

    return this.roleRepo.find({ where });
  }

  async findByOr(filter: RoleFilter = {}): Promise<RoleEntity[]> {
    const { name, description, priority, serviceId } = filter;

    const where: FindOptionsWhere<RoleEntity>[] = [];

    if (name) where.push({ name });
    if (description) where.push({ description });
    if (priority) where.push({ priority });
    if (serviceId) where.push({ serviceId });

    // ✅ 필터 없으면 전체 조회
    if (where.length === 0) {
      return this.roleRepo.find(); // 조건 없이 전체 조회
    }

    return this.roleRepo.find({ where });
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

  async createRole(
    attrs: Partial<RoleEntity>,
    transactionManager?: EntityManager
  ): Promise<RoleEntity> {
    try {
      const roleEntity = new RoleEntity();

      Object.assign(roleEntity, attrs);

      return await this.roleRepo.saveEntity(roleEntity, transactionManager);
    } catch (error: unknown) {
      // 중복 키 에러나 다른 DB 에러 처리
      throw RoleException.roleCreateError();
    }
  }

  async updateRole(
    id: string,
    attrs: Partial<RoleEntity>,
    transactionManager?: EntityManager
  ): Promise<RoleEntity> {
    try {
      const role = await this.findByIdOrFail(id);

      Object.assign(role, attrs);

      await this.roleRepo.updateEntity(role, transactionManager);
      
      return role;
    } catch (error: unknown) {
      // findByIdOrFail에서 발생한 HttpException은 그대로 전파
      if (error instanceof HttpException) {
        throw error;
      }
      
      // 다른 DB 에러는 업데이트 에러로 처리
      throw RoleException.roleUpdateError();
    }
  }

  async deleteRole(id: string): Promise<UpdateResult> {
    try {
      // 역할 존재 여부 확인
      await this.findByIdOrFail(id);
      
      return await this.roleRepo.softDelete(id);
    } catch (error: unknown) {
      // findByIdOrFail에서 발생한 HttpException은 그대로 전파
      if (error instanceof HttpException) {
        throw error;
      }
      
      // 다른 DB 에러는 삭제 에러로 처리
      throw RoleException.roleDeleteError();
    }
  }
}
