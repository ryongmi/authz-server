import { Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm';

import { BaseRepository } from '@krgeobuk/core/repositories';

import { ServiceVisibleRoleEntity } from './entities/service-visible-role.entity.js';

@Injectable()
export class ServiceVisibleRoleRepository extends BaseRepository<ServiceVisibleRoleEntity> {
  constructor(private dataSource: DataSource) {
    super(ServiceVisibleRoleEntity, dataSource);
  }

  /**
   * 서비스 ID로 역할 ID 목록 조회 (최적화된 쿼리)
   */
  async findRoleIdsByServiceId(serviceId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('svr')
      .select('svr.role_id AS roleId')
      .where('svr.service_id = :serviceId', { serviceId })
      .getRawMany();

    return result.map((row) => row.roleId);
  }

  /**
   * 역할 ID로 서비스 ID 목록 조회 (최적화된 쿼리)
   */
  async findServiceIdsByRoleId(roleId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('svr')
      .select('svr.service_id AS serviceId')
      .where('svr.role_id = :roleId', { roleId })
      .getRawMany();

    return result.map((row) => row.serviceId);
  }

  /**
   * 여러 서비스의 역할 ID 목록 조회 (배치 처리)
   */
  async findRoleIdsByServiceIds(serviceIds: string[]): Promise<Record<string, string[]>> {
    const result = await this.createQueryBuilder('svr')
      .select(['svr.service_id AS serviceId', 'svr.role_id AS roleId'])
      .where('svr.service_id IN (:...serviceIds)', { serviceIds })
      .getRawMany();

    const serviceRoleMap: Record<string, string[]> = {};

    result.forEach((row) => {
      const serviceId = row.serviceId;
      const roleId = row.roleId;

      if (!serviceRoleMap[serviceId]) {
        serviceRoleMap[serviceId] = [];
      }
      serviceRoleMap[serviceId].push(roleId);
    });

    return serviceRoleMap;
  }

  /**
   * 여러 역할의 서비스 ID 목록 조회 (배치 처리)
   */
  async findServiceIdsByRoleIds(roleIds: string[]): Promise<Record<string, string[]>> {
    const result = await this.createQueryBuilder('svr')
      .select(['svr.role_id AS roleId', 'svr.service_id AS serviceId'])
      .where('svr.role_id IN (:...roleIds)', { roleIds })
      .getRawMany();

    const roleServiceMap: Record<string, string[]> = {};

    result.forEach((row) => {
      const roleId = row.roleId;
      const serviceId = row.serviceId;

      if (!roleServiceMap[roleId]) {
        roleServiceMap[roleId] = [];
      }
      roleServiceMap[roleId].push(serviceId);
    });

    return roleServiceMap;
  }

  /**
   * 서비스-역할 관계 존재 확인 (SELECT 1 + LIMIT 최적화)
   */
  async existsServiceVisibleRole(serviceId: string, roleId: string): Promise<boolean> {
    const result = await this.createQueryBuilder('svr')
      .select('1')
      .where('svr.service_id = :serviceId AND svr.role_id = :roleId', { serviceId, roleId })
      .limit(1)
      .getRawOne();

    return !!result;
  }
}
