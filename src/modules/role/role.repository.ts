import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { BaseRepository } from '@krgeobuk/core/repositories';
import type { PaginatedResult } from '@krgeobuk/core/interfaces';

import { RoleEntity } from './entities/role.entity.js';
import { RoleSearchQueryDto } from './dtos/role-search-query.dto.js';

@Injectable()
export class RoleRepository extends BaseRepository<RoleEntity> {
  constructor(private dataSource: DataSource) {
    super(RoleEntity, dataSource);
  }

  //   async updateUserPassword(
  //     id: string,
  //     password: string,
  //     changePassword: string,
  //   ): Promise<User> {
  //     const user = await this.findById(id);

  //     if (!user) {
  //       throw UserException.userNotFound();
  //     }

  //     const isExisted = await isExistedPassword(password);
  //     if (!isExisted) {
  //       throw UserException.userInfoNotExist();
  //     }

  //     const result = await isHashingPassword(changePassword);
  //     user.password = result;

  //     return await this.userRepo.save(user);
  //   }

  /**
   * 역할 검색 및 페이지네이션
   * @param query 검색 조건 및 페이지 정보
   * @returns 페이지네이션된 역할 목록
   */
  async searchRoles(query: RoleSearchQueryDto): Promise<PaginatedResult<RoleEntity>> {
    const { page = 1, limit = 30, sortOrder = 'DESC', sortBy = 'createdAt', name, description, priority, serviceId } = query;
    
    const skip = (page - 1) * limit;
    const queryBuilder = this.createQueryBuilder('role');

    if (name) {
      queryBuilder.andWhere('role.name LIKE :name', { name: `%${name}%` });
    }
    if (description) {
      queryBuilder.andWhere('role.description LIKE :description', { description: `%${description}%` });
    }
    if (priority !== undefined) {
      queryBuilder.andWhere('role.priority = :priority', { priority });
    }
    if (serviceId) {
      queryBuilder.andWhere('role.serviceId = :serviceId', { serviceId });
    }

    queryBuilder
      .orderBy(`role.${sortBy}`, sortOrder)
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
