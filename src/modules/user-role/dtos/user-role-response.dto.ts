import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserRoleResponseDto {
  @ApiProperty({
    description: '사용자 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  userId: string;

  @ApiProperty({
    description: '역할 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  roleId: string;
}