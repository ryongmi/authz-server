import { IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({
    description: '역할 이름',
    example: 'admin',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: '역할 설명',
    example: '관리자 역할',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '역할 우선순위 (낮을수록 높은 권한, 최고 레벨은 1)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  priority?: number;
}