import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
import { LocalStorageStrategy } from './strategies/local-storage.strategy';
import { S3StorageStrategy } from './strategies/s3-storage.strategy';

describe('StorageService', () => {
  let service: StorageService;
  let configService: ConfigService;
  let localStorageStrategy: LocalStorageStrategy;
  let s3StorageStrategy: S3StorageStrategy;

  const mockConfigService = {
    getOrThrow: jest.fn(),
  };

  const mockLocalStorageStrategy = {
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  const mockS3StorageStrategy = {
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LocalStorageStrategy,
          useValue: mockLocalStorageStrategy,
        },
        {
          provide: S3StorageStrategy,
          useValue: mockS3StorageStrategy,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    configService = module.get<ConfigService>(ConfigService);
    localStorageStrategy = module.get<LocalStorageStrategy>(LocalStorageStrategy);
    s3StorageStrategy = module.get<S3StorageStrategy>(S3StorageStrategy);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Initialization', () => {
    it('should use LocalStorageStrategy when driver is local', () => {
      mockConfigService.getOrThrow.mockReturnValue('local');
      // Re-instantiate to trigger constructor logic
      const serviceLocal = new StorageService(
        configService,
        localStorageStrategy,
        s3StorageStrategy,
      );
      expect((serviceLocal as any).strategy).toBe(localStorageStrategy);
    });

    it('should use S3StorageStrategy when driver is s3', () => {
      mockConfigService.getOrThrow.mockReturnValue('s3');
      const serviceS3 = new StorageService(configService, localStorageStrategy, s3StorageStrategy);
      expect((serviceS3 as any).strategy).toBe(s3StorageStrategy);
    });
  });

  describe('Methods', () => {
    beforeEach(() => {
      // Default to local for method tests
      mockConfigService.getOrThrow.mockReturnValue('local');
      // Re-inject config behavior if needed, but existing service instance has already run constructor
      // We need to re-create service or manually set strategy
      (service as any).strategy = localStorageStrategy;
    });

    it('should call upload on strategy', async () => {
      const file = { originalname: 'test.txt' } as any;
      const key = 'test-key';
      await service.upload(file, key);
      expect(localStorageStrategy.upload).toHaveBeenCalledWith(file, key);
    });

    it('should call download on strategy', async () => {
      const key = 'test-key';
      await service.download(key);
      expect(localStorageStrategy.download).toHaveBeenCalledWith(key);
    });

    it('should call delete on strategy', async () => {
      const key = 'test-key';
      await service.delete(key);
      expect(localStorageStrategy.delete).toHaveBeenCalledWith(key);
    });

    it('should call getSignedUrl on strategy', async () => {
      const key = 'test-key';
      await service.getSignedUrl(key);
      expect(localStorageStrategy.getSignedUrl).toHaveBeenCalledWith(key);
    });
  });
});
