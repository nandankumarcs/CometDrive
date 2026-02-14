import { Readable } from 'stream';

export interface StorageInterface {
  upload(file: Express.Multer.File, key: string): Promise<string>;
  download(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string): Promise<string>;
}
