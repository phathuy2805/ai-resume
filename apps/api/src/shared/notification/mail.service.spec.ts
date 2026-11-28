import { SendEmailCommand } from '@aws-sdk/client-ses';
import { describe, expect, it, vi } from 'vitest';
import { MailService } from './mail.service.js';

describe('MailService (AWS SES)', () => {
  it('only logs and skips SES call when EMAIL_ENABLED=false', async () => {
    const sendMock = vi.fn();
    const service = new MailService({
      enabled: false,
      from: 'HireFlow <no-reply@airesume.id.vn>',
      sesClient: { send: sendMock },
    });

    const res = await service.sendEmail({
      to: 'candidate@gmail.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      text: 'Hello',
    });

    expect(res).toEqual({ status: 'logged' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('skips demo accounts ending with @example.com even when enabled', async () => {
    const sendMock = vi.fn();
    const service = new MailService({
      enabled: true,
      from: 'HireFlow <no-reply@airesume.id.vn>',
      sesClient: { send: sendMock },
    });

    const res = await service.sendEmail({
      to: 'Candidate.Demo@EXAMPLE.COM',
      subject: 'Test',
      html: '<p>Hello</p>',
      text: 'Hello',
    });

    expect(res).toEqual({ status: 'skipped_demo' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends email via AWS SES SendEmailCommand when EMAIL_ENABLED=true', async () => {
    const sendMock = vi.fn().mockResolvedValueOnce({ MessageId: 'ses-msg-001' });
    const service = new MailService({
      enabled: true,
      from: 'HireFlow <no-reply@airesume.id.vn>',
      retryDelayMs: 0,
      sesClient: { send: sendMock },
    });

    const res = await service.sendEmail({
      to: 'an@gmail.com',
      subject: 'Mời phỏng vấn',
      html: '<p>Xin chào</p>',
      text: 'Xin chào',
    });

    expect(res).toEqual({ status: 'sent', messageId: 'ses-msg-001' });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0] as SendEmailCommand;
    expect(command).toBeInstanceOf(SendEmailCommand);
    expect(command.input).toEqual({
      Source: 'HireFlow <no-reply@airesume.id.vn>',
      Destination: { ToAddresses: ['an@gmail.com'] },
      Message: {
        Subject: { Data: 'Mời phỏng vấn', Charset: 'UTF-8' },
        Body: {
          Html: { Data: '<p>Xin chào</p>', Charset: 'UTF-8' },
          Text: { Data: 'Xin chào', Charset: 'UTF-8' },
        },
      },
    });
  });

  it('retries once when first AWS SES attempt fails and succeeds on second attempt', async () => {
    const sendMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('SES ThrottlingException'))
      .mockResolvedValueOnce({ MessageId: 'ses-msg-retry-ok' });

    const service = new MailService({
      enabled: true,
      from: 'HireFlow <no-reply@airesume.id.vn>',
      retryDelayMs: 0,
      sesClient: { send: sendMock },
    });

    const res = await service.sendEmail({
      to: 'an@gmail.com',
      subject: 'Retry test',
      html: '<p>Retry</p>',
      text: 'Retry',
    });

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(res).toEqual({ status: 'sent', messageId: 'ses-msg-retry-ok' });
  });

  it('returns failed status without throwing after 2 failed attempts', async () => {
    const sendMock = vi.fn().mockRejectedValue(new Error('MessageRejected'));
    const service = new MailService({
      enabled: true,
      from: 'HireFlow <no-reply@airesume.id.vn>',
      retryDelayMs: 0,
      sesClient: { send: sendMock },
    });

    const res = await service.sendEmail({
      to: 'an@gmail.com',
      subject: 'Fail test',
      html: '<p>Fail</p>',
      text: 'Fail',
    });

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(res).toEqual({ status: 'failed', error: 'MessageRejected' });
  });
});
