import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RolePermissionResponseDto {
  @ApiProperty({
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  roleId: string;

  @ApiProperty({
    description: '권한 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  permissionId: string;
}