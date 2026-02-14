import { registerAs } from '@nestjs/config';

export type FileConfig = {
  driver: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  awsDefaultS3Bucket?: string;
  awsS3Region?: string;
  maxFileSize: number;
};

export default registerAs<FileConfig>('file', () => ({
  driver: process.env.FILE_DRIVER || 'local',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsDefaultS3Bucket: process.env.AWS_DEFAULT_S3_BUCKET,
  awsS3Region: process.env.AWS_S3_REGION,
  maxFileSize: 5242880, // 5mb
}));
