import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

export class CreateShareDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID(4)
  fileId: string;

  @ApiProperty({ example: '2023-12-31T23:59:59Z', required: false })
  @IsOptional()
  @IsDateString()
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @ApiProperty({ example: 'user@example.com', required: false })
  @IsOptional()
  recipientEmail?: string;
}
