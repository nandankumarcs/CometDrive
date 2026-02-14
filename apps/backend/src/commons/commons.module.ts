import { Global, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuditLogEntity, SessionEntity, UserEntity } from '@src/entities';
import { AuditService, EmailService } from './services';

@Global()
@Module({
  imports: [SequelizeModule.forFeature([AuditLogEntity, UserEntity, SessionEntity])],
  providers: [AuditService, EmailService],
  exports: [AuditService, EmailService, SequelizeModule],
})
export class CommonsModule {}
