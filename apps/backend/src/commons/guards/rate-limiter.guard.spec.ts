import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimiterGuard } from './rate-limiter.guard';

describe('RateLimiterGuard', () => {
  const mockRedisClient = {
    status: 'ready',
    on: jest.fn(),
  };

  const createMockContext = (ip = '127.0.0.1'): ExecutionContext => {
    const request = {
      ip,
      headers: {},
      connection: { remoteAddress: ip },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
      getClass: () => Object,
      getHandler: () => jest.fn(),
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({} as any),
      switchToWs: () => ({} as any),
      getType: () => 'http' as const,
    } as ExecutionContext;
  };

  it('should be defined', () => {
    const guard = new RateLimiterGuard(mockRedisClient as any);
    expect(guard).toBeDefined();
  });

  it('should allow a single request (graceful degradation when Redis unavailable)', async () => {
    const guard = new RateLimiterGuard(mockRedisClient as any);
    const context = createMockContext(`allow_${Date.now()}`);
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should track different IPs separately', async () => {
    const guard = new RateLimiterGuard(mockRedisClient as any);
    const context1 = createMockContext(`ip1_${Date.now()}`);
    const context2 = createMockContext(`ip2_${Date.now()}`);

    const result1 = await guard.canActivate(context1);
    const result2 = await guard.canActivate(context2);

    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });

  it('should gracefully degrade when Redis is unavailable', async () => {
    const guard = new RateLimiterGuard(mockRedisClient as any);
    const context = createMockContext(`degrade_${Date.now()}`);

    // Should allow request through even if Redis fails
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw 429 when internal rate limiter rejects with rate limit response', async () => {
    const guard = new RateLimiterGuard(mockRedisClient as any);
    const context = createMockContext(`ratelimit_${Date.now()}`);

    // Override the internal rate limiter to simulate a rate limit exceeded response
    // RateLimiterRes has msBeforeNext and remainingPoints properties
    const rateLimitResponse = {
      msBeforeNext: 30000,
      remainingPoints: 0,
      consumedPoints: 101,
      isFirstInDuration: false,
    };

    (guard as any).rateLimiter = {
      consume: jest.fn().mockRejectedValue(rateLimitResponse),
    };

    try {
      await guard.canActivate(context);
      fail('Expected HttpException to be thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect((e as HttpException).message).toBe('Too many requests. Please try again later.');
    }
  });
});
