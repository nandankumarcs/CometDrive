import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { JwtAuthGuard, RolesGuard } from './guards';
import { InvitationModule } from '../invitation/invitation.module';
import {
  UserEntity,
  UserTypeEntity,
  OrganizationEntity,
  SessionEntity,
  PasswordResetEntity,
} from '@src/entities';

/**
 * Auth Module
 *
 * Provides authentication and authorization services following SOLID:
 * - SRP: Each service has a single responsibility
 * - OCP: Extendable via new services without modifying existing ones
 * - DIP: Controllers depend on service abstractions
 */
@Module({
  imports: [
    SequelizeModule.forFeature([
      UserEntity,
      UserTypeEntity,
      OrganizationEntity,
      SessionEntity,
      PasswordResetEntity,
    ]),
    forwardRef(() => InvitationModule),
  ],
  controllers: [AuthController],
  providers: [
    // Core services (SRP - each has single responsibility)
    PasswordService,
    TokenService,
    SessionService,

    // Orchestrator service
    AuthService,

    // Guards
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    PasswordService,
    TokenService,
    SessionService,
    JwtAuthGuard,
    RolesGuard,
    SequelizeModule,
  ],
})
export class AuthModule {}
