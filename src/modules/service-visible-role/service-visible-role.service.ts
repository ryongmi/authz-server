import { Injectable } from '@nestjs/common';

import { EntityManager, FindOptionsWhere, In, UpdateResult } from 'typeorm';

import type { PaginatedResult } from '@krgeobuk/core/interfaces';

import { ServiceVisibleRoleEntity } from './entities/service-visible-role.entity.js';
import { ServiceVisibleRoleRepository } from './service-visible-role.repository.js';
import { ServiceVisibleRoleSearchQueryDto } from './dtos/service-visible-role-search-query.dto.js';
import { AssignServiceVisibleRoleDto } from './dtos/assign-service-visible-role.dto.js';

interface Filter {
  serviceId?: string;
  roleId?: string;
}

@Injectable()
export class ServiceVisibleRoleService {
  constructor(
    // private readonly dataSource: DataSource,
    private readonly svrRepo: ServiceVisibleRoleRepository
  ) {}

  async searchServiceVisibleRoles(query: ServiceVisibleRoleSearchQueryDto): Promise<PaginatedResult<ServiceVisibleRoleEntity>> {
    return this.svrRepo.searchServiceVisibleRoles(query);
  }

  async findByServiceId(serviceId: string): Promise<ServiceVisibleRoleEntity[]> {
    return this.svrRepo.find({ where: { serviceId } });
  }

  async findByRoleId(roleId: string): Promise<ServiceVisibleRoleEntity[]> {
    return this.svrRepo.find({ where: { roleId } });
  }

  async findByServiceIds(serviceIds: string[]): Promise<ServiceVisibleRoleEntity[]> {
    return this.svrRepo.find({ where: { serviceId: In(serviceIds) } });
  }

  async findByRoleIds(roleIds: string[]): Promise<ServiceVisibleRoleEntity[]> {
    return this.svrRepo.find({ where: { roleId: In(roleIds) } });
  }

  async findByAnd(filter: Filter = {}): Promise<ServiceVisibleRoleEntity[]> {
    const where: FindOptionsWhere<ServiceVisibleRoleEntity> = {};

    if (filter.serviceId) where.serviceId = filter.serviceId;
    if (filter.roleId) where.roleId = filter.roleId;

    // ✅ 필터 없으면 전체 조회
    if (Object.keys(where).length === 0) {
      return this.svrRepo.find(); // 조건 없이 전체 조회
    }

    return this.svrRepo.find({ where });
  }

  async findByOr(filter: Filter = {}): Promise<ServiceVisibleRoleEntity[]> {
    const { serviceId, roleId } = filter;

    const where: FindOptionsWhere<ServiceVisibleRoleEntity>[] = [];

    if (serviceId) where.push({ serviceId });
    if (roleId) where.push({ roleId });

    // ✅ 필터 없으면 전체 조회
    if (where.length === 0) {
      return this.svrRepo.find(); // 조건 없이 전체 조회
    }

    return this.svrRepo.find({ where });
  }

  async assignServiceVisibleRole(
    dto: AssignServiceVisibleRoleDto,
    transactionManager?: EntityManager
  ): Promise<ServiceVisibleRoleEntity> {
    // 이미 할당된 관계인지 확인
    const existing = await this.svrRepo.findOne({
      where: { serviceId: dto.serviceId, roleId: dto.roleId }
    });

    if (existing) {
      throw new Error('Service visible role already assigned');
    }

    const svrEntity = new ServiceVisibleRoleEntity();
    Object.assign(svrEntity, dto);

    return this.svrRepo.saveEntity(svrEntity, transactionManager);
  }

  async removeServiceVisibleRole(
    serviceId: string, 
    roleId: string,
    transactionManager?: EntityManager
  ): Promise<void> {
    const serviceVisibleRole = await this.svrRepo.findOne({
      where: { serviceId, roleId }
    });

    if (!serviceVisibleRole) {
      throw new Error('Service visible role not found');
    }

    await this.svrRepo.remove(serviceVisibleRole);
  }
}
