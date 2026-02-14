import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { StorageInterface } from '../interfaces/storage.interface';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

@Injectable()
export class LocalStorageStrategy implements StorageInterface {
  private readonly logger = new Logger(LocalStorageStrategy.name);
  private readonly uploadDir = path.resolve('uploads');

  constructor() {
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory at ${this.uploadDir}`);
    }
  }

  async upload(file: Express.Multer.File, key: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    // Ensure parent directory exists for nested keys (if any)
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      await fs.promises.writeFile(filePath, file.buffer);
      this.logger.log(`File uploaded locally: ${filePath}`);
      return key; // For local storage, key is the relative path
    } catch (error) {
      this.logger.error(`Error uploading file locally: ${error.message}`, error.stack);
      throw error;
    }
  }

  async download(key: string): Promise<Readable> {
    const filePath = path.join(this.uploadDir, key);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`File not found: ${key}`);
    }
    return fs.createReadStream(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
        this.logger.log(`File deleted locally: ${filePath}`);
      } catch (error) {
        this.logger.error(`Error deleting file locally: ${error.message}`, error.stack);
        throw error;
      }
    } else {
      this.logger.warn(`File to delete not found: ${filePath}`);
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    // For local storage, we can't generate a signed URL like S3.
    // Instead, we return a relative URL that the backend static serve logic handles.
    // Assuming backend serves uploads at /api/v1/storage/download/:key or similar.
    // For now, return the key, user will likely use a controller proxy to download.
    return key;
  }
}
