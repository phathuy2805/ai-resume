import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import envConfig from '../config/env.config.js';
import {
  APPLICATION_STATUS_CHANGED_EVENT,
  type ApplicationStatusChangedPayload,
} from '../constants/application-event.constant.js';
import { ApplicationStatus } from '../constants/application-status.enum.js';
import {
  buildCvRejectedEmail,
  buildInterviewFailedEmail,
  buildInterviewInvitedEmail,
  buildInterviewPassedEmail,
  buildInterviewSubmittedEmail,
} from './email-templates.js';
import { MailService } from './mail.service.js';
import {
  DEFAULT_INTERVIEW_DEADLINE_DAYS,
  INTERVIEW_COMPLETED_EVENT,
  NOTIFIABLE_APPLICATION_STATUSES,
} from './notification.constant.js';
import { NotificationRepository } from './notification.repository.js';

export interface InterviewCompletedNotificationPayload {
  interviewId: string;
  applicationId: string;
  jobId: string;
  candidateId: string;
  completedAt: Date;
}

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly mailService: MailService,
  ) {}

  @OnEvent(APPLICATION_STATUS_CHANGED_EVENT)
  async handleApplicationStatusChanged(payload: ApplicationStatusChangedPayload): Promise<void> {
    if (!NOTIFIABLE_APPLICATION_STATUSES.has(payload.toStatus)) {
      return;
    }

    if (!payload.actorId) {
      return;
    }

    try {
      const application = await this.notificationRepo.findApplicationById(payload.applicationId);
      if (!application) {
        this.logger.warn(
          `Bỏ qua gửi email: không tìm thấy hồ sơ application=${payload.applicationId}`,
        );
        return;
      }

      const frontendOrigin = this.getFrontendOrigin();
      const email = this.buildStatusEmail(
        payload.toStatus,
        application,
        frontendOrigin,
        payload.candidateMessage,
      );
      if (!email) {
        return;
      }

      await this.mailService.sendEmail({
        to: application.candidate.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Lỗi gửi email thông báo cho application=${payload.applicationId} (${payload.toStatus}): ${reason}`,
      );
    }
  }

  @OnEvent(INTERVIEW_COMPLETED_EVENT)
  async handleInterviewCompleted(payload: InterviewCompletedNotificationPayload): Promise<void> {
    try {
      const application = await this.notificationRepo.findApplicationById(payload.applicationId);
      if (!application) {
        this.logger.warn(
          `Bỏ qua gửi email xác nhận nộp bài: không tìm thấy application=${payload.applicationId}`,
        );
        return;
      }

      const frontendOrigin = this.getFrontendOrigin();
      const email = buildInterviewSubmittedEmail({
        candidateName: application.candidate.fullName,
        jobTitle: application.job.title,
        applicationsUrl: `${frontendOrigin}/candidate/applications`,
      });

      await this.mailService.sendEmail({
        to: application.candidate.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Lỗi gửi email xác nhận hoàn thành phỏng vấn cho application=${payload.applicationId}: ${reason}`,
      );
    }
  }

  private buildStatusEmail(
    toStatus: ApplicationStatus,
    application: NonNullable<Awaited<ReturnType<NotificationRepository['findApplicationById']>>>,
    frontendOrigin: string,
    candidateMessage?: string | null,
  ) {
    const feedbackUrl = `${frontendOrigin}/candidate/applications/${application.id}/feedback`;

    switch (toStatus) {
      case ApplicationStatus.INTERVIEW_INVITED: {
        const interviewId = application.interview?.id ?? application.id;
        const expiresAt =
          application.interview?.expiresAt ??
          (application.interview?.createdAt
            ? new Date(
                application.interview.createdAt.getTime() +
                  DEFAULT_INTERVIEW_DEADLINE_DAYS * 24 * 60 * 60 * 1000,
              )
            : null);

        return buildInterviewInvitedEmail({
          candidateName: application.candidate.fullName,
          jobTitle: application.job.title,
          interviewUrl: `${frontendOrigin}/candidate/interviews/${interviewId}`,
          deadlineDays: DEFAULT_INTERVIEW_DEADLINE_DAYS,
          expiresAt,
          candidateMessage,
        });
      }

      case ApplicationStatus.REJECTED:
        return buildCvRejectedEmail({
          candidateName: application.candidate.fullName,
          jobTitle: application.job.title,
          feedbackUrl,
          candidateMessage,
        });

      case ApplicationStatus.PASSED:
        return buildInterviewPassedEmail({
          candidateName: application.candidate.fullName,
          jobTitle: application.job.title,
          feedbackUrl,
          candidateMessage,
        });

      case ApplicationStatus.FAILED:
        return buildInterviewFailedEmail({
          candidateName: application.candidate.fullName,
          jobTitle: application.job.title,
          feedbackUrl,
          candidateMessage,
        });

      default:
        return null;
    }
  }

  private getFrontendOrigin(): string {
    return envConfig.FRONTEND_ORIGIN.replace(/\/+$/, '');
  }
}
