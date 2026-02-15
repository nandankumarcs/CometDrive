import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app/app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './database/config/database.config';
import { authConfig, mailerConfig, smsConfig, appConfig, redisConfig, fileConfig } from './config';
import { AllConfigType } from './config/config.type';
import { SequelizeModule } from '@nestjs/sequelize';
import { SequelizeConfigService } from './database/sequelize-config.service';
import { MailerModule } from '@crownstack/mailer';
import { SmsModule } from '@crownstack/sms';
import { CommonsModule } from './commons/commons.module';
import { RedisModule } from './redis';
import { RateLimiterGuard } from '@src/commons/guards';

// Modules
import { LoggerModule } from 'nestjs-pino';
import { AuthModule, JwtAuthGuard } from './modules/auth';
import { UserModule } from './modules/user';
import { OrganizationModule } from './modules/organization';
import { UserTypeModule } from './modules/user-type';
import { InvitationModule } from './modules/invitation/invitation.module';
import { StorageModule } from './modules/storage/storage.module';
import { FolderModule } from './modules/folder/folder.module';
import { FileModule } from './modules/file/file.module';
import { ShareModule } from './modules/share/share.module';

// Entities for guards
import { SequelizeModule as SequelizeFeatureModule } from '@nestjs/sequelize';
import { SessionEntity, UserEntity, AuditLogEntity } from './entities';

/**
 * Application Root Module
 *
 * DIP: Uses abstractions via module imports
 * SRP: Configuration and wiring only
 */
@Module({
  imports: [
    CommonsModule,
    StorageModule,
    ConfigModule.forRoot({
      load: [
        appConfig,
        databaseConfig,
        authConfig,
        mailerConfig,
        smsConfig,
        redisConfig,
        fileConfig,
      ],
      isGlobal: true,
    }),

    // Structured Logging (Pino)
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: () => ({
          context: 'HTTP',
        }),
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? {
                targets: [
                  {
                    target: 'pino-pretty',
                    options: {
                      singleLine: true,
                    },
                  },
                  {
                    target: 'pino/file',
                    options: { destination: './logs/app.log', mkdir: true },
                  },
                ],
              }
            : undefined,
      },
    }),

    // Database
    SequelizeModule.forRootAsync({
      useClass: SequelizeConfigService,
    }),

    // Register entities for global guards
    SequelizeFeatureModule.forFeature([SessionEntity, UserEntity, AuditLogEntity]),

    // Mailer Package (only for sending)
    MailerModule.forRootAsync({
      isGlobal: true,
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const mailerCfg = configService.getOrThrow('mailer', { infer: true });
        return {
          host: mailerCfg.host,
          port: mailerCfg.port,
          secure: mailerCfg.secure,
          auth: {
            user: mailerCfg.user,
            pass: mailerCfg.pass,
          },
          defaultFrom: mailerCfg.defaultFrom,
          previewEmail: mailerCfg.previewEmail,
        };
      },
      inject: [ConfigService],
    }),

    // SMS Package (only for sending)
    SmsModule.forRootAsync({
      isGlobal: true,
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const smsCfg = configService.getOrThrow('sms', { infer: true });
        return {
          accountSid: smsCfg.accountSid,
          authToken: smsCfg.authToken,
          fromNumber: smsCfg.fromNumber,
          previewMode: smsCfg.previewMode,
        };
      },
      inject: [ConfigService],
    }),

    // Redis (Global)
    RedisModule,

    // Feature Modules
    AuthModule,
    UserModule,
    OrganizationModule,
    UserTypeModule,
    InvitationModule,
    FolderModule,
    FileModule,
    ShareModule,
  ],
  controllers: [AppController],
  providers: [
    // Global JWT Auth Guard - protects all routes by default
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global Rate Limiter Guard - 100 req/min per IP
    {
      provide: APP_GUARD,
      useClass: RateLimiterGuard,
    },
  ],
  exports: [],
})
export class AppModule {}
