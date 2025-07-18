import { Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('role_permission')
@Index('IDX_ROLE_PERMISSION_ROLE', ['roleId']) // role 기준 조회
@Index('IDX_ROLE_PERMISSION_PERMISSION', ['permissionId']) // permission 기준  -> 이건 나중에 필요없으면 지우는게 좋을지도
@Index('IDX_ROLE_PERMISSION_UNIQUE', ['roleId', 'permissionId'], { unique: true }) // 중복 방지
export class RolePermissionEntity {
  // @PrimaryColumn({ type: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  roleId!: string;

  // @PrimaryColumn({ type: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  permissionId!: string;
}

