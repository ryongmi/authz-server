import { Injectable, Logger, HttpException } from '@nestjs/common';

import { ServiceVisibleRoleException } from '@krgeobuk/service-visible-role/exception';
import type { AssignServiceVisibleRole } from '@krgeobuk/service-visible-role/interfaces';

import { ServiceVisibleRoleEntity } from './entities/service-visible-role.entity.js';
import { ServiceVisibleRoleRepository } from './service-visible-role.repository.js';

@Injectable()
export class ServiceVisibleRoleService {
  private readonly logger = new Logger(ServiceVisibleRoleService.name);

  constructor(private readonly svrRepo: ServiceVisibleRoleRepository) {}

  // ==================== PUBLIC METHODS ====================

  // Level 1: 기본 Building Blocks (재사용 가능한 기본 메서드들)

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
  async exists(serviceId: string, roleId: string): Promise<boolean> {
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
  async getRoleIdsBatch(serviceIds: string[]): Promise<Map<string, string[]>> {
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
  async getServiceIdsBatch(roleIds: string[]): Promise<Map<string, string[]>> {
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

  // Level 2: 컨트롤러 매칭 메서드 (Level 1 조합 + 비즈니스 로직)

  /**
   * 단일 서비스-역할 할당
   */
  async assignServiceVisibleRole(dto: AssignServiceVisibleRole): Promise<void> {
    try {
      const exists = await this.exists(dto.serviceId, dto.roleId);
      if (exists) {
        this.logger.warn('Service visible role already assigned', {
          serviceId: dto.serviceId,
          roleId: dto.roleId,
        });
        throw ServiceVisibleRoleException.serviceVisibleRoleAlreadyExists();
      }

      const entity = new ServiceVisibleRoleEntity();
      entity.serviceId = dto.serviceId;
      entity.roleId = dto.roleId;

      await this.svrRepo.saveEntity(entity);

      this.logger.log('Service visible role assigned successfully', {
        serviceId: dto.serviceId,
        roleId: dto.roleId,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Service visible role assignment failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: dto.serviceId,
        roleId: dto.roleId,
      });

      throw ServiceVisibleRoleException.assignError();
    }
  }

  /**
   * 단일 서비스-역할 해제
   */
  async revokeServiceVisibleRole(serviceId: string, roleId: string): Promise<void> {
    try {
      const result = await this.svrRepo.delete({ serviceId, roleId });

      if (result.affected === 0) {
        this.logger.warn('Service visible role not found for revocation', {
          serviceId,
          roleId,
        });
        throw ServiceVisibleRoleException.serviceVisibleRoleNotFound();
      }

      this.logger.log('Service visible role revoked successfully', {
        serviceId,
        roleId,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Service visible role revocation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId,
        roleId,
      });

      throw ServiceVisibleRoleException.revokeError();
    }
  }

  // ==================== 배치 처리 메서드 ====================

  /**
   * 여러 역할을 서비스에 할당 (배치)
   */
  async assignMultipleRoles(serviceId: string, roleIds: string[]): Promise<void> {
    try {
      const entities = roleIds.map((roleId) => {
        const entity = new ServiceVisibleRoleEntity();
        entity.serviceId = serviceId;
        entity.roleId = roleId;
        return entity;
      });

      await this.svrRepo
        .createQueryBuilder()
        .insert()
        .into(ServiceVisibleRoleEntity)
        .values(entities)
        .orIgnore()
        .execute();

      this.logger.log('Multiple service visible roles assigned successfully', {
        serviceId,
        roleCount: roleIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('Multiple service visible roles assignment failed', {
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
  async revokeMultipleRoles(serviceId: string, roleIds: string[]): Promise<void> {
    try {
      const result = await this.svrRepo
        .createQueryBuilder()
        .delete()
        .from(ServiceVisibleRoleEntity)
        .where('serviceId = :serviceId AND roleId IN (:...roleIds)', { serviceId, roleIds })
        .execute();

      this.logger.log('Multiple service visible roles revoked successfully', {
        serviceId,
        roleCount: roleIds.length,
        affectedRows: result.affected || 0,
      });
    } catch (error: unknown) {
      this.logger.error('Multiple service visible roles revocation failed', {
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
  async replaceServiceRoles(dto: { serviceId: string; roleIds: string[] }): Promise<void> {
    try {
      await this.svrRepo.manager.transaction(async (manager) => {
        await manager.delete(ServiceVisibleRoleEntity, { serviceId: dto.serviceId });

        if (dto.roleIds.length > 0) {
          const entities = dto.roleIds.map((roleId) => {
            const entity = new ServiceVisibleRoleEntity();
            entity.serviceId = dto.serviceId;
            entity.roleId = roleId;
            return entity;
          });

          await manager.save(ServiceVisibleRoleEntity, entities);
        }
      });

      this.logger.log('Service roles replaced successfully', {
        serviceId: dto.serviceId,
        newRoleCount: dto.roleIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('Service roles replacement failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: dto.serviceId,
        newRoleCount: dto.roleIds.length,
      });

      throw ServiceVisibleRoleException.replaceError();
    }
  }

}
