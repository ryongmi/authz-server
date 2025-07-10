import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { BaseRepository } from '@krgeobuk/core/repositories';
import type { PaginatedResult } from '@krgeobuk/core/interfaces';

import { RolePermissionEntity } from './entities/role-permission.entity.js';
import { RolePermissionSearchQueryDto } from './dtos/role-permission-search-query.dto.js';

@Injectable()
export class RolePermissionRepository extends BaseRepository<RolePermissionEntity> {
  constructor(private dataSource: DataSource) {
    super(RolePermissionEntity, dataSource);
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
   * 역할-권한 관계를 검색합니다.
   * @param query 검색 조건 및 페이지 정보
   * @returns 페이지네이션된 역할-권한 목록
   */
  async searchRolePermissions(query: RolePermissionSearchQueryDto): Promise<PaginatedResult<RolePermissionEntity>> {
    const { page = 1, limit = 30, sortOrder = 'DESC', sortBy = 'roleId', roleId, permissionId } = query;
    
    const skip = (page - 1) * limit;
    const queryBuilder = this.createQueryBuilder('rolePermission');

    if (roleId) {
      queryBuilder.andWhere('rolePermission.roleId = :roleId', { roleId });
    }
    if (permissionId) {
      queryBuilder.andWhere('rolePermission.permissionId = :permissionId', { permissionId });
    }

    queryBuilder
      .orderBy(`rolePermission.${sortBy}`, sortOrder)
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

  // 기존 주석 코드
  // async findAllWithFilters(query: ListQuery): Promise<PaginatedResult<Partial<Service>>> {
  //   const {
  //     email,
  //     name,
  //     nickname,
  //     provider,
  //     page = 1,
  //     limit = 30,
  //     sortOrder = 'DESC',
  //     sortBy = 'createdAt',
  //   } = query;
  //   const skip = (page - 1) * limit;

  //   const userAlias = 'user';
  //   const oauthAccountAlias = 'oauthAccount';

  //   const qb = this.createQueryBuilder(userAlias)
  //     .leftJoin(OAuthAccount, oauthAccountAlias, `${oauthAccountAlias}.userId = ${userAlias}.id`)
  //     .addSelect(`${oauthAccountAlias}.provider`, 'provider'); // 필요한 경우만 선택
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

  //   qb.orderBy(`${userAlias}.${sortBy}`, sortOrder).skip(skip).take(limit);

  //   // const [items, total] = await qb
  //   //   .orderBy(`${userAlias}.${sortBy}`, sortOrder)
  //   //   .skip(skip)
  //   //   .take(limit)
  //   //   .getManyAndCount();

  //   const [rows, total] = await Promise.all([qb.getRawMany(), qb.getCount()]);

  //   const data = rows.map((row) => ({
  //     id: row[`${userAlias}_id`],
  //     email: row[`${userAlias}_email`],
  //     name: row[`${userAlias}_name`],
  //     nickname: row[`${userAlias}_nickname`],
  //     provider: row[`${oauthAccountAlias}_provider`],
  //   }));

  //   const totalPages = Math.ceil(total / limit);

  //   return {
  //     data,
  //     total,
  //     page,
  //     limit,
  //     totalPages,
  //   };
  // }

  // // 예시: 유저와 프로필을 조인해서 조회
  // async findUserWithProfile(userId: string): Promise<Service | null> {
  //   return this.getQueryBuilder('user')
  //     .leftJoinAndSelect('user.profile', 'profile')
  //     .where('user.id = :userId', { userId })
  //     .getOne();
  // }
}
