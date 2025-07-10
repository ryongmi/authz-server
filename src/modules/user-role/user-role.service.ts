import { Injectable } from '@nestjs/common';

import { DataSource, EntityManager, FindOptionsWhere, In, UpdateResult } from 'typeorm';

import type { PaginatedResult } from '@krgeobuk/core/interfaces';

import { UserRoleEntity } from './entities/user-role.entity.js';
import { UserRoleRepository } from './user-role.repository.js';
import { UserRoleSearchQueryDto } from './dtos/user-role-search-query.dto.js';
import { AssignUserRoleDto } from './dtos/assign-user-role.dto.js';

interface Filter {
  userId?: string;
  roleId?: string;
}

@Injectable()
export class UserRoleService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly userRoleRepo: UserRoleRepository
  ) {}

  async searchUserRoles(query: UserRoleSearchQueryDto): Promise<PaginatedResult<UserRoleEntity>> {
    return this.userRoleRepo.searchUserRoles(query);
  }

  async findByUserId(userId: string): Promise<UserRoleEntity[]> {
    return this.userRoleRepo.find({ where: { userId } });
  }

  async findByRoleId(roleId: string): Promise<UserRoleEntity[]> {
    return this.userRoleRepo.find({ where: { roleId } });
  }

  async findByUserIds(userIds: string[]): Promise<UserRoleEntity[]> {
    return this.userRoleRepo.find({ where: { userId: In(userIds) } });
  }

  async findByRoleIds(roleIds: string[]): Promise<UserRoleEntity[]> {
    return this.userRoleRepo.find({ where: { roleId: In(roleIds) } });
  }

  async findByAnd(filter: Filter = {}): Promise<UserRoleEntity[]> {
    const where: FindOptionsWhere<UserRoleEntity> = {};

    if (filter.userId) where.userId = filter.userId;
    if (filter.roleId) where.roleId = filter.roleId;

    // ✅ 필터 없으면 전체 조회
    if (Object.keys(where).length === 0) {
      return this.userRoleRepo.find(); // 조건 없이 전체 조회
    }

    return this.userRoleRepo.find({ where });
  }

  async findByOr(filter: Filter = {}): Promise<UserRoleEntity[]> {
    const { userId, roleId } = filter;

    const where: FindOptionsWhere<UserRoleEntity>[] = [];

    if (userId) where.push({ userId });
    if (roleId) where.push({ roleId });

    // ✅ 필터 없으면 전체 조회
    if (where.length === 0) {
      return this.userRoleRepo.find(); // 조건 없이 전체 조회
    }

    return this.userRoleRepo.find({ where });
  }

  async assignUserRole(
    dto: AssignUserRoleDto,
    transactionManager?: EntityManager
  ): Promise<UserRoleEntity> {
    // 이미 할당된 역할인지 확인
    const existing = await this.userRoleRepo.findOne({
      where: { userId: dto.userId, roleId: dto.roleId }
    });

    if (existing) {
      throw new Error('User role already assigned');
    }

    const userRoleEntity = new UserRoleEntity();
    Object.assign(userRoleEntity, dto);

    return this.userRoleRepo.saveEntity(userRoleEntity, transactionManager);
  }

  async removeUserRole(
    userId: string, 
    roleId: string,
    transactionManager?: EntityManager
  ): Promise<void> {
    const userRole = await this.userRoleRepo.findOne({
      where: { userId, roleId }
    });

    if (!userRole) {
      throw new Error('User role not found');
    }

    await this.userRoleRepo.remove(userRole);
  }
}
