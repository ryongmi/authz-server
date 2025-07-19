import { Injectable, Logger, HttpException } from '@nestjs/common';

import { In } from 'typeorm';

import { ServiceVisibleRoleException } from '@krgeobuk/service-visible-role/exception';
import type { ServiceVisibleRoleBatchAssignmentResult } from '@krgeobuk/service-visible-role/interfaces';
import type { TcpServiceRoleBatch } from '@krgeobuk/service-visible-role/tcp/interfaces';
import type { ServiceVisibleRoleParams } from '@krgeobuk/shared/service-visible-role';

import { ServiceVisibleRoleEntity } from './entities/service-visible-role.entity.js';
import { ServiceVisibleRoleRepository } from './service-visible-role.repository.js';

@Injectable()
export class ServiceVisibleRoleService {
  private readonly logger = new Logger(ServiceVisibleRoleService.name);

  constructor(private readonly svrRepo: ServiceVisibleRoleRepository) {}

  // ==================== 조회 메서드 (ID 목록 반환) ====================

  /**
   * 서비스의 역할 ID 목록 조회
   */
  async getRoleIds(serviceId: string): Promise<string[]> {
    try {
      return await this.svrRepo.findRoleIdsByServiceId(serviceId);
    } catch (error: unknown) {
      this.logger.error('Role IDs fetch by service failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId,
      });
      throw ServiceVisibleRoleException.fetchError();
    }
  }

  /**
   * 역할의 서비스 ID 목록 조회
   */
  async getServiceIds(roleId: string): Promise<string[]> {
    try {
      return await this.svrRepo.findServiceIdsByRoleId(roleId);
    } catch (error: unknown) {
      this.logger.error('Service IDs fetch by role failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
      });
      throw ServiceVisibleRoleException.fetchError();
    }
  }

  /**
   * 서비스-역할 관계 존재 확인
   */
  async exists(parmas: ServiceVisibleRoleParams): Promise<boolean> {
    const { serviceId, roleId } = parmas;

    try {
      return await this.svrRepo.existsServiceVisibleRole(serviceId, roleId);
    } catch (error: unknown) {
      this.logger.error('Service visible role existence check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId,
        roleId,
      });
      throw ServiceVisibleRoleException.fetchError();
    }
  }

  /**
   * 여러 서비스의 역할 ID 목록 조회 (배치)
   */
  async getRoleIdsBatch(serviceIds: string[]): Promise<Record<string, string[]>> {
    try {
      return await this.svrRepo.findRoleIdsByServiceIds(serviceIds);
    } catch (error: unknown) {
      this.logger.error('Role IDs fetch by services failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceCount: serviceIds.length,
      });
      throw ServiceVisibleRoleException.fetchError();
    }
  }

  /**
   * 여러 역할의 서비스 ID 목록 조회 (배치)
   */
  async getServiceIdsBatch(roleIds: string[]): Promise<Record<string, string[]>> {
    try {
      return await this.svrRepo.findServiceIdsByRoleIds(roleIds);
    } catch (error: unknown) {
      this.logger.error('Service IDs fetch by roles failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleCount: roleIds.length,
      });
      throw ServiceVisibleRoleException.fetchError();
    }
  }

  /**
   * 여러 서비스의 역할 수 조회 (배치) - 성능 최적화
   */
  async getRoleCountsBatch(serviceIds: string[]): Promise<Record<string, number>> {
    try {
      const roleIdsMap = await this.svrRepo.findRoleIdsByServiceIds(serviceIds);
      const roleCounts: Record<string, number> = {};

      serviceIds.forEach((serviceId) => {
        const roleIds = roleIdsMap[serviceId] || [];
        roleCounts[serviceId] = roleIds.length;
      });

      return roleCounts;
    } catch (error: unknown) {
      this.logger.error('서비스별 역할 수 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceCount: serviceIds.length,
      });
      throw ServiceVisibleRoleException.fetchError();
    }
  }

  // ==================== 변경 메서드 ====================

  /**
   * 단일 서비스-역할 할당
   */
  async assignServiceVisibleRole(params: ServiceVisibleRoleParams): Promise<void> {
    const { serviceId, roleId } = params;

    try {
      const exists = await this.exists({ serviceId, roleId });
      if (exists) {
        this.logger.warn('서비스-역할 관계 이미 존재', {
          serviceId,
          roleId,
        });
        throw ServiceVisibleRoleException.serviceVisibleRoleAlreadyExists();
      }

      const entity = new ServiceVisibleRoleEntity();
      Object.assign(entity, { serviceId, roleId });

      await this.svrRepo.save(entity);

      this.logger.log('서비스-역할 할당 성공', {
        serviceId,
        roleId,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('서비스-역할 할당 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId,
        roleId,
      });

      throw ServiceVisibleRoleException.assignError();
    }
  }

  /**
   * 단일 서비스-역할 해제
   */
  async revokeServiceVisibleRole(params: ServiceVisibleRoleParams): Promise<void> {
    const { serviceId, roleId } = params;

    try {
      const result = await this.svrRepo.delete({ serviceId, roleId });

      if (result.affected === 0) {
        this.logger.warn('해제할 서비스-역할 관계를 찾을 수 없음', {
          serviceId,
          roleId,
        });
        throw ServiceVisibleRoleException.serviceVisibleRoleNotFound();
      }

      this.logger.log('서비스-역할 해제 성공', {
        serviceId,
        roleId,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('서비스-역할 해제 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId,
        roleId,
      });

      throw ServiceVisibleRoleException.revokeError();
    }
  }

  // ==================== 배치 처리 메서드 ====================

  /**
   * 여러 역할을 서비스에 할당 (배치) - 개선된 로직
   */
  async assignMultipleRoles(
    dto: TcpServiceRoleBatch
  ): Promise<ServiceVisibleRoleBatchAssignmentResult> {
    const { serviceId, roleIds } = dto;

    try {
      // 1. 기존 할당 역할 조회
      const existingRoles = await this.getRoleIds(serviceId);
      const newRoles = roleIds.filter((id) => !existingRoles.includes(id));
      const duplicates = roleIds.filter((id) => existingRoles.includes(id));

      if (newRoles.length === 0) {
        this.logger.warn('새로운 역할 할당 없음 - 모든 역할이 이미 존재', {
          serviceId,
          requestedCount: roleIds.length,
          duplicateCount: duplicates.length,
        });

        return {
          success: true,
          affected: 0,
          details: {
            assigned: 0,
            skipped: duplicates.length,
            duplicates,
            newAssignments: [],
            serviceId,
            assignedRoles: [],
          },
        };
      }

      // 2. 새로운 역할만 할당
      const entities = newRoles.map((roleId) => {
        const entity = new ServiceVisibleRoleEntity();
        entity.serviceId = serviceId;
        entity.roleId = roleId;
        return entity;
      });

      await this.svrRepo.save(entities);

      this.logger.log('서비스 다중 역할 할당 성공', {
        serviceId,
        assignedCount: newRoles.length,
        skippedCount: duplicates.length,
        totalRequested: roleIds.length,
      });

      return {
        success: true,
        affected: newRoles.length,
        details: {
          assigned: newRoles.length,
          skipped: duplicates.length,
          duplicates,
          newAssignments: newRoles,
          serviceId,
          assignedRoles: newRoles,
        },
      };
    } catch (error: unknown) {
      this.logger.error('서비스 다중 역할 할당 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId,
        roleCount: roleIds.length,
      });

      throw ServiceVisibleRoleException.assignMultipleError();
    }
  }

  /**
   * 서비스에서 여러 역할 해제 (배치)
   */
  async revokeMultipleRoles(dto: TcpServiceRoleBatch): Promise<void> {
    const { serviceId, roleIds } = dto;

    try {
      await this.svrRepo.delete({
        serviceId,
        roleId: In(roleIds),
      });

      this.logger.log('서비스 다중 역할 해제 성공', {
        serviceId,
        roleCount: roleIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('서비스 다중 역할 해제 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId,
        roleCount: roleIds.length,
      });

      throw ServiceVisibleRoleException.revokeMultipleError();
    }
  }

  /**
   * 서비스 역할 완전 교체 (배치)
   */
  async replaceServiceRoles(dto: TcpServiceRoleBatch): Promise<void> {
    const { serviceId, roleIds } = dto;

    try {
      await this.svrRepo.manager.transaction(async (manager) => {
        await manager.delete(ServiceVisibleRoleEntity, { serviceId });

        if (roleIds.length > 0) {
          const entities = roleIds.map((roleId) => {
            const entity = new ServiceVisibleRoleEntity();
            entity.serviceId = serviceId;
            entity.roleId = roleId;
            return entity;
          });

          await manager.save(ServiceVisibleRoleEntity, entities);
        }
      });

      this.logger.log('서비스 역할 교체 성공', {
        serviceId,
        newRoleCount: roleIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('서비스 역할 교체 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId,
        newRoleCount: roleIds.length,
      });

      throw ServiceVisibleRoleException.replaceError();
    }
  }

  // ==================== 성능 최적화 메서드 (Service 중심) ====================

  /**
   * 🔥 SECONDARY: 역할에 할당된 서비스 존재 확인 (Role 삭제 시 사용)
   */
  async hasServicesForRole(roleId: string): Promise<boolean> {
    try {
      const serviceIds = await this.svrRepo.findServiceIdsByRoleId(roleId);
      return serviceIds.length > 0;
    } catch (error: unknown) {
      this.logger.error('역할의 서비스 존재 확인 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
      });
      throw ServiceVisibleRoleException.fetchError();
    }
  }
}

