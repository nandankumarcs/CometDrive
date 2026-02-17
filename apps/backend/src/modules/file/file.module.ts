import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  FileEntity,
  FilePlaybackProgressEntity,
  FileVideoCommentEntity,
  FolderEntity,
  AuditLogEntity,
  OrganizationEntity,
  UserEntity,
  Share,
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
      FileVideoCommentEntity,
      FolderEntity,
      AuditLogEntity,
      OrganizationEntity,
      UserEntity,
      Share,
    ]),
    StorageModule,
    AuthModule,
  ],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
