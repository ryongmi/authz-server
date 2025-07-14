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
      .select('svr.roleId')
      .where('svr.serviceId = :serviceId', { serviceId })
      .getRawMany();

    return result.map((row) => row.svr_roleId);
  }

  /**
   * 역할 ID로 서비스 ID 목록 조회 (최적화된 쿼리)
   */
  async findServiceIdsByRoleId(roleId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('svr')
      .select('svr.serviceId')
      .where('svr.roleId = :roleId', { roleId })
      .getRawMany();

    return result.map((row) => row.svr_serviceId);
  }

  /**
   * 여러 서비스의 역할 ID 목록 조회 (배치 처리)
   */
  async findRoleIdsByServiceIds(serviceIds: string[]): Promise<Map<string, string[]>> {
    const result = await this.createQueryBuilder('svr')
      .select(['svr.serviceId', 'svr.roleId'])
      .where('svr.serviceId IN (:...serviceIds)', { serviceIds })
      .getRawMany();

    const serviceRoleMap = new Map<string, string[]>();

    result.forEach((row) => {
      const serviceId = row.svr_serviceId;
      const roleId = row.svr_roleId;

      if (!serviceRoleMap.has(serviceId)) {
        serviceRoleMap.set(serviceId, []);
      }
      serviceRoleMap.get(serviceId)!.push(roleId);
    });

    return serviceRoleMap;
  }

  /**
   * 여러 역할의 서비스 ID 목록 조회 (배치 처리)
   */
  async findServiceIdsByRoleIds(roleIds: string[]): Promise<Map<string, string[]>> {
    const result = await this.createQueryBuilder('svr')
      .select(['svr.roleId', 'svr.serviceId'])
      .where('svr.roleId IN (:...roleIds)', { roleIds })
      .getRawMany();

    const roleServiceMap = new Map<string, string[]>();

    result.forEach((row) => {
      const roleId = row.svr_roleId;
      const serviceId = row.svr_serviceId;

      if (!roleServiceMap.has(roleId)) {
        roleServiceMap.set(roleId, []);
      }
      roleServiceMap.get(roleId)!.push(serviceId);
    });

    return roleServiceMap;
  }

  /**
   * 서비스-역할 관계 존재 확인 (SELECT 1 + LIMIT 최적화)
   */
  async existsServiceVisibleRole(serviceId: string, roleId: string): Promise<boolean> {
    const result = await this.createQueryBuilder('svr')
      .select('1')
      .where('svr.serviceId = :serviceId AND svr.roleId = :roleId', { serviceId, roleId })
      .limit(1)
      .getRawOne();

    return !!result;
  }
}

