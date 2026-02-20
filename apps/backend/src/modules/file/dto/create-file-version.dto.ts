import { IsOptional, IsString } from 'class-validator';

export class CreateFileVersionDto {
  @IsOptional()
  @IsString()
  message?: string;
}
