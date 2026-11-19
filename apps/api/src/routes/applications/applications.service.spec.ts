import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import { JobStatus } from '../../shared/constants/job.constant.js';
import type { StorageService } from '../../shared/services/storage.service.js';
import { ApplicationErrorCode } from './applications.error.js';
import type {
  ApplicationsRepository,
  ApplicationSummary,
  CreateApplicationData,
} from './applications.repository.js';
import { ApplicationsService } from './applications.service.js';
import type { CvTextExtractor } from './cv-text.extractor.js';

const CANDIDATE_ID = '11111111-1111-4111-8111-111111111111';
const JOB_ID = '22222222-2222-4222-8222-222222222222';
const OPEN_JOB = {
  id: JOB_ID,
  title: 'Backend NestJS',
  status: JobStatus.OPEN,
};

const file = {
  buffer: Buffer.from('%PDF-1.7 cv'),
  originalname: 'CV_Nguyễn_Văn_A.pdf',
  size: 11,
  mimetype: 'application/pdf',
} as Express.Multer.File;

/**
 * Cố tình kèm cvText, cvS3Key (như khi lỡ đổi select thành include) để kiểm tra mapper
 * không bao giờ trả chúng ra ngoài.
 */
function savedApplication(data: CreateApplicationData): ApplicationSummary {
  const now = new Date('2026-11-18T03:00:00.000Z');
  return {
    id: '33333333-3333-4333-8333-333333333333',
    ...data,
    status: 'SUBMITTED',
    aiRecommendation: null,
    createdAt: now,
    updatedAt: now,
    job: { id: OPEN_JOB.id, title: OPEN_JOB.title },
  } as ApplicationSummary;
}

function uniqueViolation() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

function codeOf(error: unknown): string | undefined {
  return (error as { getResponse?: () => { code?: string } }).getResponse?.()
    ?.code;
}

describe('ApplicationsService', () => {
  const repo = {
    findJobForApply: vi.fn(),
    existsByJobAndCandidate: vi.fn(),
    createWithHistory: vi.fn(),
    findByCandidate: vi.fn(),
  };
  const storage = { putObject: vi.fn(), deleteObject: vi.fn() };
  const extractor = { extract: vi.fn() };
  const service = new ApplicationsService(
    repo as unknown as ApplicationsRepository,
    storage as unknown as StorageService,
    extractor as unknown as CvTextExtractor,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    repo.findJobForApply.mockResolvedValue(OPEN_JOB);
    repo.existsByJobAndCandidate.mockResolvedValue(false);
    repo.createWithHistory.mockImplementation(async (data) =>
      savedApplication(data),
    );
    extractor.extract.mockResolvedValue({ text: 'Kỹ năng: NestJS' });
    storage.putObject.mockResolvedValue(undefined);
    storage.deleteObject.mockResolvedValue(undefined);
  });

  it('thành công: trích text → upload S3 → lưu DB, trả DTO không lộ cvText/cvS3Key', async () => {
    const result = await service.apply(CANDIDATE_ID, JOB_ID, file);

    const [key, body, contentType] = storage.putObject.mock.calls[0];
    expect(key).toMatch(new RegExp(`^cvs/${JOB_ID}/[0-9a-f-]{36}\\.pdf$`));
    expect(body).toBe(file.buffer);
    expect(contentType).toBe('application/pdf');

    expect(repo.createWithHistory).toHaveBeenCalledWith({
      jobId: JOB_ID,
      candidateId: CANDIDATE_ID,
      cvS3Key: key,
      cvFileName: 'CV_Nguyễn_Văn_A.pdf',
      cvSizeBytes: 11,
      cvMimeType: 'application/pdf',
      cvText: 'Kỹ năng: NestJS',
    });

    expect(result).toEqual({
      id: '33333333-3333-4333-8333-333333333333',
      status: 'SUBMITTED',
      job: { id: JOB_ID, title: 'Backend NestJS' },
      cvFileName: 'CV_Nguyễn_Văn_A.pdf',
      cvSizeBytes: 11,
      cvMimeType: 'application/pdf',
      aiRecommendation: null,
      createdAt: '2026-11-18T03:00:00.000Z',
      updatedAt: '2026-11-18T03:00:00.000Z',
    });
    expect(result).not.toHaveProperty('cvText');
    expect(result).not.toHaveProperty('cvS3Key');
  });

  it('trích text trước khi upload S3', async () => {
    await service.apply(CANDIDATE_ID, JOB_ID, file);

    expect(extractor.extract.mock.invocationCallOrder[0]).toBeLessThan(
      storage.putObject.mock.invocationCallOrder[0],
    );
  });

  it('job không tồn tại → 404 JOB_NOT_FOUND, không trích text, không upload', async () => {
    repo.findJobForApply.mockResolvedValue(null);

    const error = await service
      .apply(CANDIDATE_ID, JOB_ID, file)
      .catch((e) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(codeOf(error)).toBe(ApplicationErrorCode.JOB_NOT_FOUND);
    expect(extractor.extract).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('job đã đóng → 409 JOB_CLOSED', async () => {
    repo.findJobForApply.mockResolvedValue({
      ...OPEN_JOB,
      status: JobStatus.CLOSED,
    });

    const error = await service
      .apply(CANDIDATE_ID, JOB_ID, file)
      .catch((e) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect(codeOf(error)).toBe(ApplicationErrorCode.JOB_CLOSED);
    expect(extractor.extract).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('đã nộp vào job này → 409 ALREADY_APPLIED, không trích text, không upload', async () => {
    repo.existsByJobAndCandidate.mockResolvedValue(true);

    const error = await service
      .apply(CANDIDATE_ID, JOB_ID, file)
      .catch((e) => e);

    expect(codeOf(error)).toBe(ApplicationErrorCode.ALREADY_APPLIED);
    expect(repo.existsByJobAndCandidate).toHaveBeenCalledWith(
      JOB_ID,
      CANDIDATE_ID,
    );
    expect(extractor.extract).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('CV lỗi (422) → không upload, không lưu DB', async () => {
    extractor.extract.mockRejectedValue(
      new UnprocessableEntityException({ message: 'scan', code: 'SCANNED' }),
    );

    const error = await service
      .apply(CANDIDATE_ID, JOB_ID, file)
      .catch((e) => e);

    expect(codeOf(error)).toBe('SCANNED');
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(repo.createWithHistory).not.toHaveBeenCalled();
  });

  it('upload S3 lỗi → ném lỗi, không lưu DB', async () => {
    storage.putObject.mockRejectedValue(new Error('AccessDenied'));

    await expect(service.apply(CANDIDATE_ID, JOB_ID, file)).rejects.toThrow(
      'AccessDenied',
    );
    expect(repo.createWithHistory).not.toHaveBeenCalled();
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('lưu DB lỗi → xóa file vừa upload, ném lại lỗi gốc', async () => {
    const dbError = new Error('DB down');
    repo.createWithHistory.mockRejectedValue(dbError);

    await expect(service.apply(CANDIDATE_ID, JOB_ID, file)).rejects.toBe(
      dbError,
    );
    const uploadedKey = storage.putObject.mock.calls[0][0];
    expect(storage.deleteObject).toHaveBeenCalledWith(uploadedKey);
  });

  it('2 request cùng lúc: DB báo trùng (P2002) → xóa file, trả 409 ALREADY_APPLIED', async () => {
    repo.createWithHistory.mockRejectedValue(uniqueViolation());

    const error = await service
      .apply(CANDIDATE_ID, JOB_ID, file)
      .catch((e) => e);

    expect(codeOf(error)).toBe(ApplicationErrorCode.ALREADY_APPLIED);
    expect(storage.deleteObject).toHaveBeenCalledTimes(1);
  });

  it('xóa file mồ côi cũng lỗi → vẫn ném lỗi gốc của DB', async () => {
    const dbError = new Error('DB down');
    repo.createWithHistory.mockRejectedValue(dbError);
    storage.deleteObject.mockRejectedValue(new Error('S3 timeout'));

    await expect(service.apply(CANDIDATE_ID, JOB_ID, file)).rejects.toBe(
      dbError,
    );
  });

  describe('findMine', () => {
    it('trả hồ sơ của đúng ứng viên, giữ thứ tự, không lộ cvText/cvS3Key', async () => {
      const older = savedApplication({
        jobId: JOB_ID,
        candidateId: CANDIDATE_ID,
        cvS3Key: 'cvs/a.pdf',
        cvFileName: 'a.pdf',
        cvSizeBytes: 1,
        cvMimeType: 'application/pdf',
        cvText: 'bí mật',
      });
      const newer = {
        ...older,
        id: '44444444-4444-4444-8444-444444444444',
        status: 'SCREENED',
        aiRecommendation: 'PASS',
      } as ApplicationSummary;
      repo.findByCandidate.mockResolvedValue([newer, older]);

      const result = await service.findMine(CANDIDATE_ID);

      expect(repo.findByCandidate).toHaveBeenCalledWith(CANDIDATE_ID);
      expect(result.map((a) => a.id)).toEqual([newer.id, older.id]);
      expect(result[0]).toMatchObject({
        status: 'SCREENED',
        aiRecommendation: 'PASS',
        job: { id: JOB_ID, title: 'Backend NestJS' },
        createdAt: '2026-11-18T03:00:00.000Z',
      });
      for (const item of result) {
        expect(item).not.toHaveProperty('cvText');
        expect(item).not.toHaveProperty('cvS3Key');
        expect(item).not.toHaveProperty('cvUrl');
      }
    });

    it('chưa nộp hồ sơ nào → mảng rỗng', async () => {
      repo.findByCandidate.mockResolvedValue([]);

      await expect(service.findMine(CANDIDATE_ID)).resolves.toEqual([]);
    });
  });
});
