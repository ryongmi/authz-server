import { Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm';

import { BaseRepository } from '@krgeobuk/core/repositories';
import { LimitType, SortOrderType, SortByBaseType } from '@krgeobuk/core/enum';
import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import type { PermissionSearchQuery } from '@krgeobuk/permission/interfaces';

import { PermissionEntity } from './entities/permission.entity.js';

@Injectable()
export class PermissionRepository extends BaseRepository<PermissionEntity> {
  constructor(private dataSource: DataSource) {
    super(PermissionEntity, dataSource);
  }

  /**
   * 권한 검색 및 페이지네이션
   * @param query 검색 조건 및 페이지 정보
   * @returns 페이지네이션된 권한 목록
   */
  async searchPermissions(
    query: PermissionSearchQuery
  ): Promise<PaginatedResult<Partial<PermissionEntity>>> {
    const {
      action,
      serviceId,
      page = 1,
      limit = LimitType.FIFTEEN,
      sortOrder = SortOrderType.DESC,
      sortBy = SortByBaseType.CREATED_AT,
    } = query;

    const skip = (page - 1) * limit;
    const permissionAlias = 'permission';

    const qb = this.createQueryBuilder(permissionAlias).select([
      `${permissionAlias}.id`,
      `${permissionAlias}.action`,
      `${permissionAlias}.description`,
      `${permissionAlias}.serviceId`,
    ]);

    // 인덱스 활용을 위한 조건 순서 최적화
    if (serviceId) {
      qb.andWhere(`${permissionAlias}.serviceId = :serviceId`, { serviceId });
    }

    if (action) {
      qb.andWhere(`${permissionAlias}.action LIKE :action`, { action: `%${action}%` });
    }

    qb.orderBy(`${permissionAlias}.${sortBy}`, sortOrder);
    qb.offset(skip).limit(limit);

    // 최적화: 별도 쿼리로 COUNT와 데이터 조회 분리하여 성능 향상
    const [rows, total] = await Promise.all([qb.getRawMany(), qb.getCount()]);

    // 타입 안전한 결과 매핑
    const items: Partial<PermissionEntity>[] = rows.map((row) => ({
      id: row[`${permissionAlias}_id`],
      action: row[`${permissionAlias}_action`],
      description: row[`${permissionAlias}_description`],
      serviceId: row[`${permissionAlias}_service_id`],
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
