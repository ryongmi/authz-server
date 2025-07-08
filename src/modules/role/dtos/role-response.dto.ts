import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RoleResponseDto {
  @ApiProperty({
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: '역할 이름',
    example: 'admin',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: '역할 설명',
    example: '관리자 역할',
  })
  @Expose()
  description: string;

  @ApiProperty({
    description: '역할 우선순위',
    example: 1,
  })
  @Expose()
  priority: number;

  @ApiProperty({
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  serviceId: string;

  @ApiProperty({
    description: '생성일시',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: '수정일시',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Expose()
  updatedAt: Date;
}