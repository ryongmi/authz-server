import { Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm';

import { BaseRepository } from '@krgeobuk/core/repositories';
import { LimitType, SortOrderType, SortByBaseType } from '@krgeobuk/core/enum';
import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import type { RoleSearchQuery } from '@krgeobuk/role/interfaces';

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

    const qb = this.createQueryBuilder(roleAlias).select([
      `${roleAlias}.id AS id`,
      `${roleAlias}.name AS name`,
      `${roleAlias}.description AS description`,
      `${roleAlias}.priority AS priority`,
      `${roleAlias}.service_id AS serviceId`,
    ]);

    // 검색 조건 적용
    if (serviceId) {
      qb.andWhere(`${roleAlias}.service_id = :serviceId`, { serviceId });
    }

    if (name) {
      qb.andWhere(`${roleAlias}.name LIKE :name`, { name: `%${name}%` });
    }

    // 인덱스 활용을 위한 조건 순서 최적화
    qb.orderBy(`${roleAlias}.${sortBy}`, sortOrder);

    qb.offset(skip).limit(limit);

    // 최적화: 별도 쿼리로 COUNT와 데이터 조회 분리하여 성능 향상
    const [items, total] = await Promise.all([qb.getRawMany(), qb.getCount()]);

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
