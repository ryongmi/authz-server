import { Entity, Column, Index } from 'typeorm';

import { BaseEntityUUID } from '@krgeobuk/core/entities';

@Entity('role')
@Index('IDX_ROLE_SERVICE_ID', ['serviceId'])
@Index('IDX_ROLE_NAME_SERVICE', ['name', 'serviceId'], { unique: true }) // 검색 최적화용 복합 인덱스 및 이름 중복 방지
export class RoleEntity extends BaseEntityUUID {
  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column({
    type: 'tinyint',
    unsigned: true,
    default: 5,
    comment: '낮을수록 더 높은 권한 - 최상위 1, 기본 5',
  })
  priority?: number;

  @Column({ type: 'uuid' })
  serviceId!: string; // 외래 키지만 관계는 맺지 않음
}
