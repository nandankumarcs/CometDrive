import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { Share } from '../../entities/share.entity';
import { FileEntity } from '../../entities/file.entity';
import { FolderEntity } from '../../entities/folder.entity';
import { UserEntity } from '../../entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Share, FileEntity, FolderEntity, UserEntity]),
    AuthModule,
    StorageModule,
    NotificationModule,
  ],
  controllers: [ShareController],
  providers: [ShareService],
  exports: [ShareService],
})
export class ShareModule {}
