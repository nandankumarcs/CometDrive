import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';
import { SharePermission } from '@src/entities';

export class UpdateShareDto {
  @ApiPropertyOptional({
    example: SharePermission.VIEWER,
    enum: SharePermission,
    description: 'Permission granted to recipient for private shares',
  })
  @IsOptional()
  @IsIn([SharePermission.VIEWER, SharePermission.EDITOR])
  permission?: SharePermission;

  @ApiPropertyOptional({ example: '2023-12-31T23:59:59Z' })
  @IsOptional()
  @ValidateIf((dto: UpdateShareDto) => dto.expiresAt !== null && dto.expiresAt !== undefined)
  @IsDateString()
  expiresAt?: Date | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  downloadEnabled?: boolean;

  @ApiPropertyOptional({ example: 'MySecret123' })
  @IsOptional()
  @IsString()
  password?: string | null;
}
