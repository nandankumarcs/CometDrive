import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuditLogEntity, UserEntity } from '@src/entities';
import { AuditController } from '@src/commons/services/audit.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SequelizeModule.forFeature([AuditLogEntity, UserEntity]), AuthModule],
  controllers: [AuditController],
})
export class AuditModule {}
