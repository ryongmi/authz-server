import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { PaginateBaseDto } from '@krgeobuk/core/dtos';

export class UserRoleSearchQueryDto extends PaginateBaseDto {
  @ApiProperty({
    description: '사용자 ID로 검색',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: '역할 ID로 검색',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  roleId?: string;
}