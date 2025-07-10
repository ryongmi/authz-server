import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { PaginateBaseDto } from '@krgeobuk/core/dtos';

export class ServiceVisibleRoleSearchQueryDto extends PaginateBaseDto {
  @ApiProperty({
    description: '서비스 ID로 검색',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({
    description: '역할 ID로 검색',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  roleId?: string;
}