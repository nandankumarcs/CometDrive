import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageStrategy } from './strategies/local-storage.strategy';
import { S3StorageStrategy } from './strategies/s3-storage.strategy';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [StorageService, LocalStorageStrategy, S3StorageStrategy],
  exports: [StorageService],
})
export class StorageModule {}
