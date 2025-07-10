import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { PaginateBaseDto } from '@krgeobuk/core/dtos';

export class RolePermissionSearchQueryDto extends PaginateBaseDto {
  @ApiProperty({
    description: '역할 ID로 검색',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiProperty({
    description: '권한 ID로 검색',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  permissionId?: string;
}