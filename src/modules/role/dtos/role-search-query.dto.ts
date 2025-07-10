import { IsOptional, IsString, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { PaginateBaseDto } from '@krgeobuk/core/dtos';

export class RoleSearchQueryDto extends PaginateBaseDto {
  @ApiProperty({
    description: '역할 이름으로 검색',
    example: 'admin',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: '역할 설명으로 검색',
    example: '관리자',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '우선순위로 검색',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priority?: number;

  @ApiProperty({
    description: '서비스 ID로 검색',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;
}