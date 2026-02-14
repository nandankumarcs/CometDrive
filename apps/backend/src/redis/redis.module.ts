import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import type { AllConfigType } from '../config/config.type';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const logger = new Logger('RedisModule');

        const host = configService.getOrThrow('redis.host', { infer: true });
        const port = configService.getOrThrow('redis.port', { infer: true });
        const password = configService.get('redis.password', { infer: true });
        const db = configService.getOrThrow('redis.db', { infer: true });
        const keyPrefix = configService.getOrThrow('redis.keyPrefix', {
          infer: true,
        });

        const client = new Redis({
          host,
          port,
          password: password || undefined,
          db,
          keyPrefix,
          retryStrategy: (times: number) => {
            if (times > 3) {
              logger.error(`Redis connection failed after ${times} attempts. Giving up.`);
              return null;
            }
            const delay = Math.min(times * 200, 2000);
            logger.warn(`Redis connection attempt ${times} failed. Retrying in ${delay}ms...`);
            return delay;
          },
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });

        client.on('connect', () => {
          logger.log(`🔴 Redis connected at ${host}:${port}/${db}`);
        });

        client.on('error', (err: Error) => {
          logger.error(`Redis error: ${err.message}`);
        });

        client.on('close', () => {
          logger.warn('Redis connection closed');
        });

        // Attempt lazy connection — don't crash if Redis is down
        client.connect().catch((err: Error) => {
          logger.warn(
            `Redis initial connection failed: ${err.message}. App will continue without Redis.`,
          );
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
