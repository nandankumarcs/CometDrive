import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdatePlaybackProgressDto {
  @ApiProperty({ example: 120 })
  @IsNumber()
  @Min(0)
  positionSeconds!: number;

  @ApiProperty({ example: 3600 })
  @IsNumber()
  @Min(1)
  durationSeconds!: number;
}
