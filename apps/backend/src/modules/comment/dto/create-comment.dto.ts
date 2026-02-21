import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsUUID, IsObject, ValidateIf } from 'class-validator';

export class CreateCommentDto {
  @ApiPropertyOptional({ description: 'UUID of the file to comment on' })
  @ValidateIf((o) => !o.folderUuid)
  @IsUUID()
  @IsNotEmpty()
  fileUuid?: string;

  @ApiPropertyOptional({ description: 'UUID of the folder to comment on' })
  @ValidateIf((o) => !o.fileUuid)
  @IsUUID()
  @IsNotEmpty()
  folderUuid?: string;

  @ApiPropertyOptional({ description: 'UUID of the parent comment, if replying' })
  @IsOptional()
  @IsUUID()
  parentUuid?: string;

  @ApiProperty({ description: 'Content of the comment' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Optional metadata for the comment (e.g. video timestamp)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
