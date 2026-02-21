import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsObject } from 'class-validator';

export class UpdateCommentDto {
  @ApiPropertyOptional({ description: 'Updated content of the comment' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @ApiPropertyOptional({ description: 'Optional metadata update' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
