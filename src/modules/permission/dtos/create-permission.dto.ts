import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({
    description: '권한 액션 (예: user:create, post:read)',
    example: 'user:create',
  })
  @IsNotEmpty()
  @IsString()
  action: string;

  @ApiProperty({
    description: '권한 설명',
    example: '사용자 생성 권한',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  serviceId: string;
}