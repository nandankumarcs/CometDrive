import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { InvitationEntity, UserEntity, UserTypeEntity } from '@src/entities';
import { InvitationService } from './invitation.service';
import { AuthModule } from '../auth/auth.module';
// Controller will be added later if needed, but signup logic might sit in AuthController
// For now, let's expose specific InvitationController for admins to manage invites
import { InvitationController } from './invitation.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([InvitationEntity, UserEntity, UserTypeEntity]),
    forwardRef(() => AuthModule),
  ],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
