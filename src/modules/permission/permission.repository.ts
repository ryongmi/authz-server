import { Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm';

import { BaseRepository } from '@krgeobuk/core/repositories';
import type { PaginatedResult } from '@krgeobuk/core/interfaces';

import { PermissionEntity } from './entities/permission.entity.js';
import { PermissionSearchQueryDto } from './dtos/permission-search-query.dto.js';

@Injectable()
export class PermissionRepository extends BaseRepository<PermissionEntity> {
  constructor(private dataSource: DataSource) {
    super(PermissionEntity, dataSource);
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
   * 권한을 검색합니다.
   * @param query 검색 조건 및 페이지 정보
   * @returns 페이지네이션된 권한 목록
   */
  async searchPermissions(
    query: PermissionSearchQueryDto
  ): Promise<PaginatedResult<PermissionEntity>> {
    const {
      page = 1,
      limit = 30,
      sortOrder = 'DESC',
      sortBy = 'createdAt',
      action,
      description,
      serviceId,
    } = query;

    const skip = (page - 1) * limit;
    const queryBuilder = this.createQueryBuilder('permission');

    if (action) {
      queryBuilder.andWhere('permission.action LIKE :action', { action: `%${action}%` });
    }
    if (description) {
      queryBuilder.andWhere('permission.description LIKE :description', {
        description: `%${description}%`,
      });
    }
    if (serviceId) {
      queryBuilder.andWhere('permission.serviceId = :serviceId', { serviceId });
    }

    queryBuilder.orderBy(`permission.${sortBy}`, sortOrder).skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 기존 주석 코드
  // async search(query: SearchQuery): Promise<PaginatedResult<SearchResult>> {
  //   const {
  //     email,
  //     name,
  //     nickname,
  //     provider,
  //     page = 1,
  //     limit = LimitType.FIFTEEN,
  //     sortOrder = SortOrderType.DESC,
  //     sortBy = 'createdAt',
  //   } = query;
  //   const skip = (page - 1) * limit;

  //   const roleAlias = 'role';
  //   const serviceAlias = 'service';

  //   const qb = this.createQueryBuilder(roleAlias)
  //     .leftJoin(Service, serviceAlias, `${roleAlias}.serviceId = ${serviceAlias}.id`)
  //     .addSelect(`${serviceAlias}.provider`);
  //   // .addSelect(`${oauthAccountAlias}.provider`, 'provider'); // 필요한 경우만 선택
  //   // const qb = this.createQueryBuilder(userAlias).leftJoinAndSelect(
  //   //   `${userAlias}.${oauthAccountAlias}`,
  //   //   oauthAccountAlias
  //   // );

  //   // const qb = this.createQueryBuilder('user')
  //   //   .leftJoin(OAuthAccount, 'oauthAccount', 'oauthAccount.userId = user.id')
  //   //   .addSelect(['user.id', 'user.email', 'user.name', 'oauthAccount.provider']);

  //   if (email) {
  //     qb.andWhere(`${userAlias}.email LIKE :email`, { email: `%${email}%` });
  //   }
  //   if (name) {
  //     qb.andWhere(`${userAlias}.name LIKE :name`, { name: `%${name}%` });
  //   }
  //   if (nickname) {
  //     qb.andWhere(`${userAlias}.nickname LIKE :nickname`, {
  //       nickname: `%${nickname}%`,
  //     });
  //   }
  //   if (provider) {
  //     qb.andWhere(`${oauthAccountAlias}.provider = :provider`, { provider });
  //   }

  //   // 특정 역할 필터링 (e.g., 'admin', 'user')
  //   // if (role) {
  //   //   qb.andWhere(`${userAlias}.role = :role`, { role });
  //   // }

  //   qb.orderBy(`${userAlias}.${sortBy}`, sortOrder);

  //   // qb.skip(skip).take(limit);
  //   qb.offset(skip).limit(limit);

  //   const [rows, total] = await Promise.all([qb.getRawMany(), qb.getCount()]);

  //   const items = rows.map((row) => ({
  //     id: row[`${userAlias}_id`],
  //     email: row[`${userAlias}_email`],
  //     name: row[`${userAlias}_name`],
  //     nickname: row[`${userAlias}_nickname`],
  //     profileImageUrl: row[`${userAlias}_profile_image_url`],
  //     isIntegrated: row[`${userAlias}_is_integrated`],
  //     isEmailVerified: row[`${userAlias}_is_email_verified`],
  //     createdAt: row[`${userAlias}_created_at`],
  //     updatedAt: row[`${userAlias}_updated_at`],
  //     deletedAt: row[`${userAlias}_deleted_at`],
  //     oauthAccount: {
  //       provider: row[`${oauthAccountAlias}_provider`],
  //     },
  //   }));

  //   const totalPages = Math.ceil(total / limit);

  //   return {
  //     items,
  //     total,
  //     page,
  //     limit,
  //     totalPages,
  //   };
  // }
}

