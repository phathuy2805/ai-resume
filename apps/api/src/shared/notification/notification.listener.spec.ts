import { beforeEach, describe, expect, it, vi } from 'vitest';
import envConfig from '../config/env.config.js';
import { ApplicationStatus } from '../constants/application-status.enum.js';
import type { MailService, SendEmailPayload } from './mail.service.js';
import { NotificationListener } from './notification.listener.js';
import type {
  NotificationApplicationRecord,
  NotificationRepository,
} from './notification.repository.js';

const APP_ID = '44444444-4444-4444-8444-444444444444';
const JOB_ID = '22222222-2222-4222-8222-222222222222';
const INTERVIEW_ID = '550e8400-e29b-41d4-a716-446655440000';
const HR_ID = '11111111-1111-4111-8111-111111111111';
const CANDIDATE_ID = '33333333-3333-4333-8333-333333333333';

function makeApplication(
  overrides: Partial<NotificationApplicationRecord> = {},
): NotificationApplicationRecord {
  return {
    id: APP_ID,
    status: ApplicationStatus.INTERVIEW_INVITED,
    candidate: {
      fullName: 'Trần Văn An',
      email: 'an.tran@gmail.com',
    },
    job: {
      title: 'Senior Backend NestJS',
    },
    interview: {
      id: INTERVIEW_ID,
      createdAt: new Date('2026-11-28T03:00:00.000Z'),
      expiresAt: new Date('2026-12-05T03:00:00.000Z'),
    },
    ...overrides,
  };
}

describe('NotificationListener', () => {
  let repo: { findApplicationById: ReturnType<typeof vi.fn> };
  let mailService: { sendEmail: ReturnType<typeof vi.fn> };
  let listener: NotificationListener;

  beforeEach(() => {
    repo = {
      findApplicationById: vi.fn().mockResolvedValue(makeApplication()),
    };
    mailService = {
      sendEmail: vi.fn().mockResolvedValue({ status: 'sent', messageId: 'msg-1' }),
    };
    listener = new NotificationListener(
      repo as unknown as NotificationRepository,
      mailService as unknown as MailService,
    );
  });

  it('sends INTERVIEW_INVITED email with interview link, 7-day deadline, mic/browser notes, and HR message', async () => {
    await listener.handleApplicationStatusChanged({
      applicationId: APP_ID,
      jobId: JOB_ID,
      fromStatus: ApplicationStatus.SHORTLISTED,
      toStatus: ApplicationStatus.INTERVIEW_INVITED,
      actorId: HR_ID,
      candidateMessage: 'Chào An, team rất ấn tượng với dự án NestJS của bạn!',
    });

    expect(mailService.sendEmail).toHaveBeenCalledTimes(1);
    const sent = mailService.sendEmail.mock.calls[0][0] as SendEmailPayload;
    const expectedOrigin = envConfig.FRONTEND_ORIGIN.replace(/\/+$/, '');

    expect(sent.to).toBe('an.tran@gmail.com');
    expect(sent.subject).toContain('Senior Backend NestJS');
    expect(sent.html).toContain(`${expectedOrigin}/candidate/interviews/${INTERVIEW_ID}`);
    expect(sent.text).toContain('7 ngày');
    expect(sent.text).toContain('micro');
    expect(sent.text).toContain('Chrome');
    expect(sent.text).toContain('Safari');
    expect(sent.text).toContain('trả lời bằng chữ');
    expect(sent.html).toContain('Chào An, team rất ấn tượng với dự án NestJS của bạn!');
  });

  it('sends REJECTED email with feedback link and no scores or internal notes', async () => {
    await listener.handleApplicationStatusChanged({
      applicationId: APP_ID,
      jobId: JOB_ID,
      fromStatus: ApplicationStatus.SCREENED,
      toStatus: ApplicationStatus.REJECTED,
      actorId: HR_ID,
    });

    expect(mailService.sendEmail).toHaveBeenCalledTimes(1);
    const sent = mailService.sendEmail.mock.calls[0][0] as SendEmailPayload;
    const expectedOrigin = envConfig.FRONTEND_ORIGIN.replace(/\/+$/, '');

    expect(sent.subject).toContain('Kết quả vòng hồ sơ');
    expect(sent.html).toContain(`${expectedOrigin}/candidate/applications/${APP_ID}/feedback`);
    expect(sent.text).toContain('chưa phù hợp');
  });

  it('sends PASSED email congratulating candidate with feedback link', async () => {
    await listener.handleApplicationStatusChanged({
      applicationId: APP_ID,
      jobId: JOB_ID,
      fromStatus: ApplicationStatus.EVALUATED,
      toStatus: ApplicationStatus.PASSED,
      actorId: HR_ID,
      candidateMessage: 'HR sẽ gọi điện trao đổi offer trong tuần này.',
    });

    expect(mailService.sendEmail).toHaveBeenCalledTimes(1);
    const sent = mailService.sendEmail.mock.calls[0][0] as SendEmailPayload;
    const expectedOrigin = envConfig.FRONTEND_ORIGIN.replace(/\/+$/, '');

    expect(sent.subject).toContain('Chúc mừng');
    expect(sent.html).toContain(`${expectedOrigin}/candidate/applications/${APP_ID}/feedback`);
    expect(sent.text).toContain('liên hệ');
    expect(sent.text).toContain('HR sẽ gọi điện trao đổi offer trong tuần này.');
  });

  it('sends FAILED email thanking candidate with feedback link', async () => {
    await listener.handleApplicationStatusChanged({
      applicationId: APP_ID,
      jobId: JOB_ID,
      fromStatus: ApplicationStatus.EVALUATED,
      toStatus: ApplicationStatus.FAILED,
      actorId: HR_ID,
    });

    expect(mailService.sendEmail).toHaveBeenCalledTimes(1);
    const sent = mailService.sendEmail.mock.calls[0][0] as SendEmailPayload;
    const expectedOrigin = envConfig.FRONTEND_ORIGIN.replace(/\/+$/, '');

    expect(sent.subject).toContain('Kết quả vòng phỏng vấn sơ bộ');
    expect(sent.html).toContain(`${expectedOrigin}/candidate/applications/${APP_ID}/feedback`);
    expect(sent.text).toContain('chưa đạt');
  });

  it.each([
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.SCREENING,
    ApplicationStatus.SCREENING_FAILED,
    ApplicationStatus.SCREENED,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.INTERVIEWING,
    ApplicationStatus.EVALUATED,
  ])('does not send email for non-notifiable status %s', async (status) => {
    await listener.handleApplicationStatusChanged({
      applicationId: APP_ID,
      jobId: JOB_ID,
      fromStatus: null,
      toStatus: status,
      actorId: HR_ID,
    });

    expect(repo.findApplicationById).not.toHaveBeenCalled();
    expect(mailService.sendEmail).not.toHaveBeenCalled();
  });

  it('does not send decision email when actorId is null (system/AI transition)', async () => {
    await listener.handleApplicationStatusChanged({
      applicationId: APP_ID,
      jobId: JOB_ID,
      fromStatus: ApplicationStatus.SCREENED,
      toStatus: ApplicationStatus.REJECTED,
      actorId: null,
    });

    expect(repo.findApplicationById).not.toHaveBeenCalled();
    expect(mailService.sendEmail).not.toHaveBeenCalled();
  });

  it('sends confirmation email when interview.completed event fires', async () => {
    await listener.handleInterviewCompleted({
      interviewId: INTERVIEW_ID,
      applicationId: APP_ID,
      jobId: JOB_ID,
      candidateId: CANDIDATE_ID,
      completedAt: new Date('2026-11-28T05:00:00.000Z'),
    });

    expect(mailService.sendEmail).toHaveBeenCalledTimes(1);
    const sent = mailService.sendEmail.mock.calls[0][0] as SendEmailPayload;
    const expectedOrigin = envConfig.FRONTEND_ORIGIN.replace(/\/+$/, '');

    expect(sent.subject).toContain('Đã tiếp nhận bài phỏng vấn');
    expect(sent.html).toContain(`${expectedOrigin}/candidate/applications`);
  });

  it('escapes HTML characters in candidate name, job title, and HR message', async () => {
    repo.findApplicationById.mockResolvedValueOnce(
      makeApplication({
        candidate: { fullName: '<script>alert(1)</script>', email: 'an@gmail.com' },
        job: { title: 'Node & <React>' },
      }),
    );

    await listener.handleApplicationStatusChanged({
      applicationId: APP_ID,
      jobId: JOB_ID,
      fromStatus: ApplicationStatus.SCREENED,
      toStatus: ApplicationStatus.REJECTED,
      actorId: HR_ID,
      candidateMessage: '<b>Chào bạn</b>',
    });

    const sent = mailService.sendEmail.mock.calls[0][0] as SendEmailPayload;
    expect(sent.html).not.toContain('<script>alert(1)</script>');
    expect(sent.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(sent.html).toContain('Node &amp; &lt;React&gt;');
    expect(sent.html).toContain('&lt;b&gt;Chào bạn&lt;/b&gt;');
  });

  it('swallows unexpected errors so status transition flow is never broken', async () => {
    repo.findApplicationById.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(
      listener.handleApplicationStatusChanged({
        applicationId: APP_ID,
        jobId: JOB_ID,
        fromStatus: ApplicationStatus.SCREENED,
        toStatus: ApplicationStatus.REJECTED,
        actorId: HR_ID,
      }),
    ).resolves.toBeUndefined();
  });
});
