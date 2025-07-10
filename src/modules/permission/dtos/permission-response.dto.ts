import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PermissionResponseDto {
  @ApiProperty({
    description: '권한 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: '권한 액션',
    example: 'user:create',
  })
  @Expose()
  action: string;

  @ApiProperty({
    description: '권한 설명',
    example: '사용자 생성 권한',
  })
  @Expose()
  description: string;

  @ApiProperty({
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  serviceId: string;

  @ApiProperty({
    description: '생성일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: '수정일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  updatedAt: Date;
}