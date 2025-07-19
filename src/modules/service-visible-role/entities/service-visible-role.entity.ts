import { Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('service_visible_role')
@Index('IDX_SVR_SERVICE', ['serviceId'])
@Index('IDX_SVR_ROLE', ['roleId'])
@Index('IDX_SVR_UNIQUE', ['serviceId', 'roleId'], { unique: true })
export class ServiceVisibleRoleEntity {
  @PrimaryColumn({ type: 'uuid' })
  serviceId!: string;

  @PrimaryColumn({ type: 'uuid' })
  roleId!: string;
}

