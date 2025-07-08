import { IsNotEmpty, IsString, IsNumber, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: '역할 이름',
    example: 'admin',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

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
  })
  @IsNotEmpty()
  @IsNumber()
  priority: number;

  @ApiProperty({
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  serviceId: string;
}