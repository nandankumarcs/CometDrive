import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { FolderEntity, AuditLogEntity } from '@src/entities';
import { FolderService } from './folder.service';
import { FolderController } from './folder.controller';

import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SequelizeModule.forFeature([FolderEntity, AuditLogEntity]), AuthModule],
  controllers: [FolderController],
  providers: [FolderService],
  exports: [FolderService],
})
export class FolderModule {}
