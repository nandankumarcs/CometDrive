import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
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
  @IsDateString()
  expiresAt?: Date;
}
