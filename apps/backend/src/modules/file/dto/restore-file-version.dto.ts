import { IsUUID } from 'class-validator';

export class RestoreFileVersionDto {
  @IsUUID(4)
  versionUuid: string;
}
