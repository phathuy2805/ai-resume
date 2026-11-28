import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import envConfig from '../config/env.config.js';
import { buildPasswordResetOtpEmail } from './email-templates.js';
import {
  DEFAULT_MAIL_RETRY_DELAY_MS,
  DEMO_EMAIL_DOMAIN,
  MAIL_SERVICE_OPTIONS,
} from './notification.constant.js';

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendPasswordResetOtpInput {
  to: string;
  fullName: string;
  otp: string;
  expiresInMinutes: number;
}

export type SendEmailResult =
  | { status: 'sent'; messageId: string | null }
  | { status: 'logged' }
  | { status: 'skipped_demo' }
  | { status: 'failed'; error: string };

export interface SesClientLike {
  send(command: SendEmailCommand): Promise<{ MessageId?: string }>;
}

export interface MailServiceOptions {
  enabled?: boolean;
  from?: string;
  region?: string;
  retryDelayMs?: number;
  sesClient?: SesClientLike;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly enabled: boolean;
  private readonly from: string;
  private readonly retryDelayMs: number;
  private readonly client: SesClientLike;

  constructor(
    @Optional()
    @Inject(MAIL_SERVICE_OPTIONS)
    options?: MailServiceOptions,
  ) {
    this.enabled = options?.enabled ?? envConfig.EMAIL_ENABLED;
    this.from = options?.from ?? envConfig.MAIL_FROM;
    this.retryDelayMs = options?.retryDelayMs ?? DEFAULT_MAIL_RETRY_DELAY_MS;

    if (options?.sesClient) {
      this.client = options.sesClient;
    } else {
      const accessKeyId = envConfig.S3_ACCESS_KEY;
      const secretAccessKey = envConfig.S3_SECRET_KEY;
      this.client = new SESClient({
        region: options?.region ?? envConfig.SES_REGION ?? envConfig.S3_REGION,
        ...(accessKeyId && secretAccessKey
          ? {
              credentials: {
                accessKeyId,
                secretAccessKey,
              },
            }
          : {}),
      });
    }
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const recipient = payload.to.trim();
    if (this.isDemoEmail(recipient)) {
      this.logger.log(`Bỏ qua gửi email cho tài khoản demo: ${recipient} (${payload.subject})`);
      return { status: 'skipped_demo' };
    }

    if (!this.enabled) {
      this.logger.log(
        `[EMAIL_ENABLED=false] Giả lập gửi email tới ${recipient} | Subject: ${payload.subject}\n${payload.text}`,
      );
      return { status: 'logged' };
    }

    let lastError = 'Lỗi không xác định khi gọi AWS SES';

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const messageId = await this.sendViaSes(recipient, payload);
        this.logger.log(
          `Đã gửi email qua AWS SES tới ${recipient} (${payload.subject}) id=${messageId ?? 'n/a'}`,
        );
        return { status: 'sent', messageId };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (attempt === 1) {
          this.logger.warn(
            `Gửi email lần 1 thất bại tới ${recipient} (${lastError}), sẽ thử lại 1 lần...`,
          );
          if (this.retryDelayMs > 0) {
            await this.sleep(this.retryDelayMs);
          }
        }
      }
    }

    this.logger.error(
      `Gửi email thất bại sau khi thử lại tới ${recipient} (${payload.subject}): ${lastError}`,
    );
    return { status: 'failed', error: lastError };
  }

  sendPasswordResetOtp(input: SendPasswordResetOtpInput): Promise<SendEmailResult> {
    const template = buildPasswordResetOtpEmail({
      fullName: input.fullName,
      otp: input.otp,
      expiresInMinutes: input.expiresInMinutes,
    });
    return this.sendEmail({
      to: input.to,
      ...template,
    });
  }

  private async sendViaSes(recipient: string, payload: SendEmailPayload): Promise<string | null> {
    const response = await this.client.send(
      new SendEmailCommand({
        Source: this.from,
        Destination: {
          ToAddresses: [recipient],
        },
        Message: {
          Subject: {
            Data: payload.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: payload.html,
              Charset: 'UTF-8',
            },
            Text: {
              Data: payload.text,
              Charset: 'UTF-8',
            },
          },
        },
      }),
    );

    return typeof response.MessageId === 'string' ? response.MessageId : null;
  }

  private isDemoEmail(email: string): boolean {
    return email.toLowerCase().endsWith(DEMO_EMAIL_DOMAIN);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
