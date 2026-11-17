import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from './storage.service.js';

const mocks = vi.hoisted(() => ({
  env: {
    S3_BUCKET: 'test-bucket',
    S3_REGION: 'ap-southeast-2',
    S3_ACCESS_KEY: undefined as string | undefined,
    S3_SECRET_KEY: undefined as string | undefined,
  },
  s3ClientCtor: vi.fn(),
  send: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock('../config/env.config.js', () => ({ default: mocks.env }));

vi.mock('@aws-sdk/client-s3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-s3')>();
  class FakeS3Client {
    send = mocks.send;
    constructor(config: unknown) {
      mocks.s3ClientCtor(config);
    }
  }
  return { ...actual, S3Client: FakeS3Client };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mocks.getSignedUrl,
}));

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.S3_ACCESS_KEY = undefined;
    mocks.env.S3_SECRET_KEY = undefined;
  });

  describe('khởi tạo S3Client', () => {
    it('có key (dev): truyền credentials', () => {
      mocks.env.S3_ACCESS_KEY = 'AKIA_TEST';
      mocks.env.S3_SECRET_KEY = 'secret';
      new StorageService();
      expect(mocks.s3ClientCtor).toHaveBeenCalledWith({
        region: 'ap-southeast-2',
        credentials: { accessKeyId: 'AKIA_TEST', secretAccessKey: 'secret' },
      });
    });

    it('không có key (production): để SDK dùng credential chain mặc định (IAM Role)', () => {
      new StorageService();
      expect(mocks.s3ClientCtor).toHaveBeenCalledWith({
        region: 'ap-southeast-2',
      });
    });
  });

  it('putObject gửi PutObjectCommand đúng bucket, key, contentType', async () => {
    const body = Buffer.from('%PDF-1.7');
    await new StorageService().putObject(
      'cvs/job-1/abc.pdf',
      body,
      'application/pdf',
    );

    const command = mocks.send.mock.calls[0][0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'test-bucket',
      Key: 'cvs/job-1/abc.pdf',
      Body: body,
      ContentType: 'application/pdf',
    });
  });

  it('deleteObject gửi DeleteObjectCommand đúng bucket, key', async () => {
    await new StorageService().deleteObject('cvs/job-1/abc.pdf');

    const command = mocks.send.mock.calls[0][0];
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'test-bucket',
      Key: 'cvs/job-1/abc.pdf',
    });
  });

  it('putObject ném lại lỗi từ S3', async () => {
    mocks.send.mockRejectedValueOnce(new Error('AccessDenied'));
    await expect(
      new StorageService().putObject('k', Buffer.from('x'), 'application/pdf'),
    ).rejects.toThrow('AccessDenied');
  });

  describe('getSignedUrl', () => {
    it('mặc định hết hạn sau 10 phút', async () => {
      mocks.getSignedUrl.mockResolvedValueOnce('https://signed.example/abc');
      const url = await new StorageService().getSignedUrl('cvs/job-1/abc.pdf');

      expect(url).toBe('https://signed.example/abc');
      const [, command, options] = mocks.getSignedUrl.mock.calls[0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input).toEqual({
        Bucket: 'test-bucket',
        Key: 'cvs/job-1/abc.pdf',
      });
      expect(options).toEqual({ expiresIn: 600 });
    });

    it('cho phép đổi thời hạn', async () => {
      await new StorageService().getSignedUrl('k', 60);
      expect(mocks.getSignedUrl.mock.calls[0][2]).toEqual({ expiresIn: 60 });
    });
  });
});
