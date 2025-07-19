import { Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('user_role')
@Index('IDX_USER_ROLE_USER', ['userId'])
@Index('IDX_USER_ROLE_ROLE', ['roleId'])
@Index('IDX_USER_ROLE_UNIQUE', ['userId', 'roleId'], { unique: true })
export class UserRoleEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'uuid' })
  roleId!: string;
}

