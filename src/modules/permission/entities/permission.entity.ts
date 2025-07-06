import { Entity, Column, Index, Unique } from 'typeorm';

import { BaseEntityUUID } from '@krgeobuk/core/entities';

@Entity('permission')
@Index('IDX_PERMISSION_SERVICE', ['serviceId']) // 서비스별 권한 검색 최적화
@Index('IDX_PERMISSION_ACTION', ['action']) // 액션 검색 최적화 (like 검색용)
@Index('IDX_PERMISSION_SVC_ACTION', ['serviceId', 'action']) // 인가 체크용 복합 인덱스
@Unique(['serviceId', 'action']) // 복합 유니크
export class PermissionEntity extends BaseEntityUUID {
  @Column({ type: 'varchar', length: 100 })
  action!: string; // 권한 명칭 (ex: user:create)

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string; // 설명

  @Column({ type: 'uuid' })
  serviceId!: string; // 어떤 서비스에 속한 권한인지
}
