import { Injectable, Logger } from '@nestjs/common';
import { StorageInterface } from '../interfaces/storage.interface';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../../config/config.type';

@Injectable()
export class S3StorageStrategy implements StorageInterface {
  private readonly logger = new Logger(S3StorageStrategy.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    const region = this.configService.get('file.awsS3Region', { infer: true });
    const accessKeyId = this.configService.get('file.awsAccessKeyId', { infer: true });
    const secretAccessKey = this.configService.get('file.awsSecretAccessKey', { infer: true });

    this.bucketName = this.configService.get('file.awsDefaultS3Bucket', { infer: true });

    if (!region || !accessKeyId || !secretAccessKey || !this.bucketName) {
      this.logger.warn('AWS S3 credentials not fully configured. S3Strategy might fail.');
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  async upload(file: Express.Multer.File, key: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`File uploaded to S3: ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Error uploading file to S3: ${error.message}`, error.stack);
      throw error;
    }
  }

  async download(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);
      return response.Body as Readable;
    } catch (error) {
      this.logger.error(`Error downloading file from S3: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`File deleted from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting file from S3: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    // Expires in 1 hour (3600 seconds)
    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }
}
