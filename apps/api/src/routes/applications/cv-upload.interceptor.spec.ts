import type { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HttpExceptionFilter } from '../../shared/filters/http-exception.filter.js';
import { JobStatus } from '../../shared/constants/job.constant.js';
import { StorageService } from '../../shared/services/storage.service.js';
import { CV_MAX_SIZE_BYTES } from './applications.constant.js';
import { ApplicationsController } from './applications.controller.js';
import {
  ApplicationsRepository,
  type CreateApplicationData,
} from './applications.repository.js';
import { ApplicationsService } from './applications.service.js';
import { CvTextExtractor } from './cv-text.extractor.js';

/**
 * Gửi multipart thật qua Multer → CvUploadInterceptor → assertValidCvFile → ApplicationsService
 * → CvTextExtractor (unpdf thật) → HttpExceptionFilter.
 * DB và S3 là bản giả (logic lưu hồ sơ đã có test ở applications.service.spec.ts).
 * Không bật JwtAuthGuard/RolesGuard (đã có test riêng ở module auth).
 */
const fakeRepo = {
  findJobForApply: async (id: string) => ({
    id,
    title: 'Backend NestJS',
    status: JobStatus.OPEN,
  }),
  existsByJobAndCandidate: async () => false,
  createWithHistory: async (data: CreateApplicationData) => ({
    id: '33333333-3333-4333-8333-333333333333',
    ...data,
    status: 'SUBMITTED',
    aiRecommendation: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    job: { id: data.jobId, title: 'Backend NestJS' },
  }),
};
const fakeStorage = {
  putObject: async () => undefined,
  deleteObject: async () => undefined,
};
const FIXTURES = path.resolve(
  import.meta.dirname,
  '../../../../../packages/ai/fixtures/cvs',
);
const REAL_PDF = readFileSync(path.join(FIXTURES, 'cv_be_01.pdf'));
const SCANNED_PDF = readFileSync(path.join(FIXTURES, 'scans/cv_scan_01.pdf'));
const JOB_ID = 'd19e9185-1715-46a2-94b2-e1e779a1d123';
const URL = `/jobs/${JOB_ID}/applications`;

describe('POST /jobs/:id/applications: nhận file CV', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        ApplicationsService,
        CvTextExtractor,
        { provide: ApplicationsRepository, useValue: fakeRepo },
        { provide: StorageService, useValue: fakeStorage },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('PDF hợp lệ → 201', async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .attach('file', REAL_PDF, {
        filename: 'cv_be_01.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'SUBMITTED',
      job: { id: JOB_ID, title: 'Backend NestJS' },
      cvFileName: 'cv_be_01.pdf',
      cvSizeBytes: REAL_PDF.length,
    });
    expect(res.body).not.toHaveProperty('cvText');
    expect(res.body).not.toHaveProperty('cvS3Key');
  });

  it('tên file tiếng Việt giữ nguyên dấu', async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .attach('file', REAL_PDF, {
        filename: 'CV_Nguyễn_Văn_Ánh.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.cvFileName).toBe('CV_Nguyễn_Văn_Ánh.pdf');
  });

  it('file > 5MB → 413 với thông báo tiếng Việt', async () => {
    const big = Buffer.concat([
      Buffer.from('%PDF-1.7\n'),
      Buffer.alloc(CV_MAX_SIZE_BYTES),
    ]);
    const res = await request(app.getHttpServer())
      .post(URL)
      .attach('file', big, {
        filename: 'big.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({
      message: 'CV có dung lượng tối đa 5MB',
      code: 'CV_FILE_TOO_LARGE',
    });
  });

  it('file .docx đổi đuôi .pdf → 400', async () => {
    const docx = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.alloc(200),
    ]);
    const res = await request(app.getHttpServer())
      .post(URL)
      .attach('file', docx, {
        filename: 'cv.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      message: 'CV phải là file PDF',
      code: 'CV_INVALID_FILE_TYPE',
    });
  });

  it('không gửi file → 400', async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .field('note', 'không có file');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      message: 'Vui lòng chọn file CV để nộp',
      code: 'CV_FILE_REQUIRED',
    });
  });

  it('CV ảnh scan → 422 SCANNED', async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .attach('file', SCANNED_PDF, {
        filename: 'cv_scan_01.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('SCANNED');
    expect(res.body.message).toMatch(/ảnh scan/);
  });

  it('PDF hỏng (có %PDF nhưng nội dung rác) → 422 CORRUPTED', async () => {
    const broken = Buffer.concat([
      Buffer.from('%PDF-1.7\n'),
      Buffer.alloc(500, 0x41),
    ]);
    const res = await request(app.getHttpServer())
      .post(URL)
      .attach('file', broken, {
        filename: 'broken.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('CORRUPTED');
  });

  it('gửi file sai tên field → 400', async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .attach('cv', REAL_PDF, {
        filename: 'cv.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
  });

  it('job id không phải UUID → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/jobs/abc/applications')
      .attach('file', REAL_PDF, {
        filename: 'cv.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
  });
});
