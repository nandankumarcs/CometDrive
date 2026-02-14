import { Injectable, Inject, Logger } from '@nestjs/common';
import { StorageInterface } from './interfaces/storage.interface';
import { LocalStorageStrategy } from './strategies/local-storage.strategy';
import { S3StorageStrategy } from './strategies/s3-storage.strategy';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private strategy: StorageInterface;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly localStorageStrategy: LocalStorageStrategy,
    private readonly s3StorageStrategy: S3StorageStrategy,
  ) {
    const driver = this.configService.getOrThrow('file.driver', { infer: true });

    if (driver === 's3') {
      this.strategy = this.s3StorageStrategy;
      this.logger.log('Using S3StorageStrategy');
    } else {
      this.strategy = this.localStorageStrategy;
      this.logger.log('Using LocalStorageStrategy');
    }
  }

  async upload(file: Express.Multer.File, key: string): Promise<string> {
    return this.strategy.upload(file, key);
  }

  async download(key: string): Promise<any> {
    return this.strategy.download(key);
  }

  async delete(key: string): Promise<void> {
    return this.strategy.delete(key);
  }

  async getSignedUrl(key: string): Promise<string> {
    return this.strategy.getSignedUrl(key);
  }
}
