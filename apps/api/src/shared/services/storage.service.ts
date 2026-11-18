import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import envConfig from '../config/env.config.js';
import { SIGNED_URL_EXPIRES_SEC } from '../constants/storage.constant.js';

/**
 * Lưu file trên Amazon S3 (bucket private). Dùng chung cho CV (tuần 1), audio và transcript (tuần 3).
 *
 * Credentials:
 * - Có S3_ACCESS_KEY/S3_SECRET_KEY (dev): dùng key của IAM user dev.
 * - Không có (production): AWS SDK tự dùng credential chain mặc định, trên EC2 là IAM Role.
 *
 * Không log nội dung file, chỉ log key.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = envConfig.S3_BUCKET;
    this.client = new S3Client({
      region: envConfig.S3_REGION,
      ...(envConfig.S3_ACCESS_KEY && envConfig.S3_SECRET_KEY
        ? {
            credentials: {
              accessKeyId: envConfig.S3_ACCESS_KEY,
              secretAccessKey: envConfig.S3_SECRET_KEY,
            },
          }
        : {}),
    });
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    this.logger.log(
      `Uploaded s3://${this.bucket}/${key} (${body.length} bytes)`,
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Deleted s3://${this.bucket}/${key}`);
  }

  /** Link xem file tạm thời (mặc định 10 phút). Bucket private nên đây là cách duy nhất để xem file. */
  getSignedUrl(
    key: string,
    expiresInSec: number = SIGNED_URL_EXPIRES_SEC,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSec },
    );
  }
}
