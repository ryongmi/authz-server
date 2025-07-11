import { Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm';

import { BaseRepository } from '@krgeobuk/core/repositories';
import { LimitType, SortOrderType, SortByBaseType } from '@krgeobuk/core/enum';
import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import type { RoleSearchQuery } from '@krgeobuk/role/interfaces';

import { UserRoleEntity } from '@modules/user-role/index.js';

import { RoleEntity } from './entities/role.entity.js';

@Injectable()
export class RoleRepository extends BaseRepository<RoleEntity> {
  constructor(private dataSource: DataSource) {
    super(RoleEntity, dataSource);
  }

  /**
   * 역할 검색 및 페이지네이션
   * @param query 검색 조건 및 페이지 정보
   * @returns 페이지네이션된 역할 목록
   */
  async searchRoles(query: RoleSearchQuery): Promise<PaginatedResult<Partial<RoleEntity>>> {
    const {
      name,
      serviceId,
      page = 1,
      limit = LimitType.FIFTEEN,
      sortOrder = SortOrderType.DESC,
      sortBy = SortByBaseType.CREATED_AT,
    } = query;

    const skip = (page - 1) * limit;
    const roleAlias = 'role';
    const userRoleAlias = 'userRole';

    const qb = this.createQueryBuilder(roleAlias)
      .select([
        `${roleAlias}.id`,
        `${roleAlias}.name`, 
        `${roleAlias}.description`,
        `${roleAlias}.priority`,
        `${roleAlias}.serviceId`,
      ]);

    if (serviceId) {
      qb.leftJoin(
        UserRoleEntity,
        userRoleAlias,
        `${roleAlias}.id = ${userRoleAlias}.roleId`
      ).andWhere(`${roleAlias}.serviceId = :serviceId`, { serviceId });
    }
    
    if (name) {
      qb.andWhere(`${roleAlias}.name LIKE :name`, { name: `%${name}%` });
    }

    // 인덱스 활용을 위한 조건 순서 최적화
    qb.orderBy(`${roleAlias}.${sortBy}`, sortOrder);

    qb.offset(skip).limit(limit);

    // 최적화: 별도 쿼리로 COUNT와 데이터 조회 분리하여 성능 향상
    const [rows, total] = await Promise.all([
      qb.getRawMany(),
      qb.getCount()
    ]);

    const items: Partial<RoleEntity>[] = rows.map((row) => ({
      id: row[`${roleAlias}_id`],
      name: row[`${roleAlias}_name`],
      description: row[`${roleAlias}_description`],
      priority: row[`${roleAlias}_priority`],
      serviceId: row[`${roleAlias}_service_id`],
    }));

    const totalPages = Math.ceil(total / limit);
    const pageInfo = {
      page,
      limit,
      totalItems: total,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };

    return {
      items,
      pageInfo,
    };
  }
}
