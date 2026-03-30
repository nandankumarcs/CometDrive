import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { FolderEntity, FileEntity, AuditLogEntity, Share, UserEntity } from '@src/entities';
import { FolderService } from './folder.service';
import { FolderController } from './folder.controller';

import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    SequelizeModule.forFeature([FolderEntity, FileEntity, AuditLogEntity, Share, UserEntity]),
    AuthModule,
    StorageModule,
  ],
  controllers: [FolderController],
  providers: [FolderService],
  exports: [FolderService],
})
export class FolderModule {}
