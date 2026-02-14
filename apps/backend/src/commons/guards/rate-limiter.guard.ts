import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { RateLimiterRedis, RateLimiterMemory, RateLimiterAbstract } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private rateLimiter: RateLimiterAbstract;
  private readonly logger = new Logger(RateLimiterGuard.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {
    try {
      this.rateLimiter = new RateLimiterRedis({
        storeClient: this.redisClient,
        keyPrefix: 'rate_limit',
        points: 100, // max requests
        duration: 60, // per 60 seconds
        blockDuration: 0, // no additional block time
      });
      this.logger.log('Rate limiter initialized with Redis store');
    } catch {
      this.logger.warn('Failed to init Redis rate limiter, falling back to in-memory');
      this.rateLimiter = new RateLimiterMemory({
        keyPrefix: 'rate_limit',
        points: 100,
        duration: 60,
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key =
      request.ip ||
      request.headers['x-forwarded-for'] ||
      request.connection?.remoteAddress ||
      'unknown';

    try {
      await this.rateLimiter.consume(key);
      return true;
    } catch (error: unknown) {
      // rate-limiter-flexible rejects with a RateLimiterRes when limit exceeded
      // It has `msBeforeNext` and `remainingPoints` properties
      if (error && typeof error === 'object' && 'msBeforeNext' in error) {
        throw new HttpException(
          'Too many requests. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // For Redis connection failures or other errors, allow the request through
      // (graceful degradation) and log the error
      this.logger.warn(`Rate limiter error (allowing request): ${error}`);
      return true;
    }
  }
}
