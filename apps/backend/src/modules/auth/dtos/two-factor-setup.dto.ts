import { IsOptional, IsString } from 'class-validator';

export class TwoFactorSetupDto {
  @IsOptional()
  @IsString()
  label?: string;
}
