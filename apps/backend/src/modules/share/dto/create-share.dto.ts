import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { SharePermission } from '@src/entities';

export class CreateShareDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsOptional()
  @ValidateIf((dto: CreateShareDto) => !dto.folderId)
  @IsUUID(4)
  fileId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsOptional()
  @ValidateIf((dto: CreateShareDto) => !dto.fileId)
  @IsUUID(4)
  folderId?: string;

  @ApiProperty({ example: '2023-12-31T23:59:59Z', required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @ApiProperty({ example: 'user@example.com', required: false })
  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @ApiProperty({
    example: SharePermission.VIEWER,
    required: false,
    enum: SharePermission,
    description: 'Permission granted to recipient for private shares',
  })
  @IsOptional()
  @IsIn([SharePermission.VIEWER, SharePermission.EDITOR])
  permission?: SharePermission;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  downloadEnabled?: boolean;

  @ApiProperty({ example: 'MySecret123', required: false })
  @IsOptional()
  @IsString()
  password?: string;
}
