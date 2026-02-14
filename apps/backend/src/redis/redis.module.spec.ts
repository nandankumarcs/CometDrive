import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from './redis.constants';
import { RedisModule } from './redis.module';

describe('RedisModule', () => {
  it('should compile the module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const values: Record<string, string | number> = {
                'redis.host': 'localhost',
                'redis.port': 6379,
                'redis.db': 0,
                'redis.keyPrefix': 'test:',
              };
              return values[key];
            }),
            get: jest.fn(() => undefined),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            on: jest.fn(),
            connect: jest.fn().mockResolvedValue(undefined),
            quit: jest.fn().mockResolvedValue(undefined),
            status: 'ready',
          },
        },
      ],
    }).compile();

    const redisClient = module.get(REDIS_CLIENT);
    expect(redisClient).toBeDefined();
  });

  it('should export REDIS_CLIENT token', () => {
    expect(REDIS_CLIENT).toBe('REDIS_CLIENT');
  });

  it('should export RedisModule class', () => {
    expect(RedisModule).toBeDefined();
  });
});
