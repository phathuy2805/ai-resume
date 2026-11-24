import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationStatus } from '../constants/application-status.enum.js';
import type { ScreeningPipelineService } from './screening-pipeline.service.js';
import { ScreeningRecoveryService } from './screening-recovery.service.js';
import { ScreeningListener } from './screening.listener.js';
import type { ScreeningRepository } from './screening.repository.js';

const APP_ID = 'a1000000-0000-4000-8000-000000000001';
const JOB_ID = 'b2000000-0000-4000-8000-000000000002';

describe('ScreeningListener', () => {
  let pipeline: { enqueue: ReturnType<typeof vi.fn> };
  let listener: ScreeningListener;

  beforeEach(() => {
    pipeline = { enqueue: vi.fn() };
    listener = new ScreeningListener(pipeline as unknown as ScreeningPipelineService);
  });

  it('enqueue khi hồ sơ vừa nộp (null → SUBMITTED)', () => {
    listener.handleStatusChanged({
      applicationId: APP_ID,
      jobId: JOB_ID,
      fromStatus: null,
      toStatus: ApplicationStatus.SUBMITTED,
      actorId: 'cand-1',
    });

    expect(pipeline.enqueue).toHaveBeenCalledWith(APP_ID);
  });

  it.each([
    ApplicationStatus.SCREENING,
    ApplicationStatus.SCREENED,
    ApplicationStatus.SCREENING_FAILED,
    ApplicationStatus.SHORTLISTED,
  ])('bỏ qua sự kiện chuyển sang %s', (toStatus) => {
    listener.handleStatusChanged({
      applicationId: APP_ID,
      jobId: JOB_ID,
      fromStatus: ApplicationStatus.SUBMITTED,
      toStatus,
      actorId: null,
    });

    expect(pipeline.enqueue).not.toHaveBeenCalled();
  });
});

describe('ScreeningRecoveryService', () => {
  it('đưa lại mọi hồ sơ SUBMITTED / SCREENING vào pipeline khi khởi động', async () => {
    const pipeline = { enqueue: vi.fn() };
    const repo = { findPendingIds: vi.fn().mockResolvedValue(['app-1', 'app-2']) };
    const recovery = new ScreeningRecoveryService(
      repo as unknown as ScreeningRepository,
      pipeline as unknown as ScreeningPipelineService,
    );

    await expect(recovery.recover()).resolves.toBe(2);
    expect(pipeline.enqueue.mock.calls).toEqual([['app-1'], ['app-2']]);
  });

  it('DB lỗi khi khôi phục → ghi log, không làm sập server', async () => {
    const pipeline = { enqueue: vi.fn() };
    const repo = { findPendingIds: vi.fn().mockRejectedValue(new Error('DB down')) };
    const recovery = new ScreeningRecoveryService(
      repo as unknown as ScreeningRepository,
      pipeline as unknown as ScreeningPipelineService,
    );

    await expect(recovery.recover()).resolves.toBe(0);
    expect(pipeline.enqueue).not.toHaveBeenCalled();
  });
});
