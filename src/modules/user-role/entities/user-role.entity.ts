import { Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_role')
@Index('IDX_USER_ROLE_USER', ['userId'])
@Index('IDX_USER_ROLE_ROLE', ['roleId'])
@Index('IDX_USER_ROLE_UNIQUE', ['userId', 'roleId'], { unique: true })
export class UserRoleEntity {
  // @PrimaryColumn({ type: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  userId!: string;

  // @PrimaryColumn({ type: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  roleId!: string;
}

