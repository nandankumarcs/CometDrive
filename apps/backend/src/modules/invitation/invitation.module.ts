import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { InvitationEntity, UserEntity, UserTypeEntity } from '@src/entities';
import { InvitationService } from './invitation.service';
// Controller will be added later if needed, but signup logic might sit in AuthController
// For now, let's expose specific InvitationController for admins to manage invites
import { InvitationController } from './invitation.controller';

@Module({
  imports: [SequelizeModule.forFeature([InvitationEntity, UserEntity, UserTypeEntity])],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
