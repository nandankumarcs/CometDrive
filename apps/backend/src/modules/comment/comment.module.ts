import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { CommentEntity } from '../../entities/comment.entity';
import { FileEntity } from '../../entities/file.entity';
import { FolderEntity } from '../../entities/folder.entity';
import { UserEntity } from '../../entities/user.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    SequelizeModule.forFeature([CommentEntity, FileEntity, FolderEntity, UserEntity]),
    NotificationModule,
  ],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
