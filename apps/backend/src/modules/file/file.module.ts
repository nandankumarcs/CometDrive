import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  FileEntity,
  FilePlaybackProgressEntity,
  FolderEntity,
  AuditLogEntity,
  OrganizationEntity,
  UserEntity,
} from '@src/entities';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { StorageModule } from '@src/modules/storage/storage.module';

import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      FileEntity,
      FilePlaybackProgressEntity,
      FolderEntity,
      AuditLogEntity,
      OrganizationEntity,
      UserEntity,
    ]),
    StorageModule,
    AuthModule,
  ],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
