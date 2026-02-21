import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { NotificationEntity } from '@src/entities';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';

import { AuthModule } from '../auth';

@Module({
  imports: [SequelizeModule.forFeature([NotificationEntity]), AuthModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
