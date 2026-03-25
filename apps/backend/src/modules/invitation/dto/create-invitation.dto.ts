import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'test@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}
