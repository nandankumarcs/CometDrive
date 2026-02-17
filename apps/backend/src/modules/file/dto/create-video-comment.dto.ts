import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateVideoCommentDto {
  @ApiProperty({ example: 'Great explanation at this point.' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  content!: string;

  @ApiProperty({ example: 87 })
  @IsInt()
  @Min(0)
  timestampSeconds!: number;
}
