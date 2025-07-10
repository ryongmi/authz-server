import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { PaginateBaseDto } from '@krgeobuk/core/dtos';

export class PermissionSearchQueryDto extends PaginateBaseDto {
  @ApiProperty({
    description: '액션으로 검색',
    example: 'user:create',
    required: false,
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({
    description: '설명으로 검색',
    example: '사용자',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '서비스 ID로 검색',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;
}