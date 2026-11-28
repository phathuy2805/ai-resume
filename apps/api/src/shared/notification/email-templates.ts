export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface InterviewInvitedTemplateInput {
  candidateName: string;
  jobTitle: string;
  interviewUrl: string;
  deadlineDays: number;
  expiresAt?: Date | null;
  candidateMessage?: string | null;
}

export interface ApplicationFeedbackTemplateInput {
  candidateName: string;
  jobTitle: string;
  feedbackUrl: string;
  candidateMessage?: string | null;
}

export interface InterviewSubmittedTemplateInput {
  candidateName: string;
  jobTitle: string;
  applicationsUrl: string;
}

export interface PasswordResetOtpTemplateInput {
  fullName: string;
  otp: string;
  expiresInMinutes: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDeadlineVi(expiresAt?: Date | null): string | null {
  if (!expiresAt) {
    return null;
  }
  const day = String(expiresAt.getDate()).padStart(2, '0');
  const month = String(expiresAt.getMonth() + 1).padStart(2, '0');
  const year = expiresAt.getFullYear();
  const hours = String(expiresAt.getHours()).padStart(2, '0');
  const minutes = String(expiresAt.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes} ngày ${day}/${month}/${year}`;
}

function renderHrMessageBlock(candidateMessage?: string | null): { html: string; text: string } {
  const trimmed = candidateMessage?.trim();
  if (!trimmed) {
    return { html: '', text: '' };
  }

  const escaped = escapeHtml(trimmed).replace(/\r?\n/g, '<br />');
  return {
    html: `
      <div style="margin: 16px 0; padding: 12px 16px; background-color: #f3f4f6; border-left: 4px solid #2563eb; border-radius: 4px;">
        <p style="margin: 0 0 6px; font-weight: 600; color: #111827;">Lời nhắn từ nhà tuyển dụng:</p>
        <p style="margin: 0; color: #374151;">${escaped}</p>
      </div>
    `,
    text: `\nLời nhắn từ nhà tuyển dụng:\n${trimmed}\n`,
  };
}

function wrapHtmlLayout(title: string, bodyHtml: string, ctaLabel: string, ctaUrl: string): string {
  const safeUrl = escapeHtml(ctaUrl);
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f9fafb; font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #1d4ed8; padding: 20px 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px;">HireFlow</h1>
    </div>
    <div style="padding: 24px;">
      ${bodyHtml}
      <div style="margin: 24px 0;">
        <a href="${safeUrl}" style="display: inline-block; padding: 12px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">${escapeHtml(ctaLabel)}</a>
      </div>
      <p style="margin: 0; font-size: 13px; color: #6b7280;">
        Nếu nút trên không hoạt động, hãy sao chép đường dẫn sau vào trình duyệt:<br />
        <a href="${safeUrl}" style="color: #2563eb; word-break: break-all;">${safeUrl}</a>
      </p>
    </div>
    <div style="padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
      Đây là email tự động từ hệ thống tuyển dụng HireFlow. Vui lòng không trả lời trực tiếp email này.
    </div>
  </div>
</body>
</html>`;
}

export function buildInterviewInvitedEmail(input: InterviewInvitedTemplateInput): RenderedEmail {
  const subject = `[HireFlow] Mời tham gia phỏng vấn AI — ${input.jobTitle}`;
  const hrMessage = renderHrMessageBlock(input.candidateMessage);
  const formattedDeadline = formatDeadlineVi(input.expiresAt);
  const deadlineSentence = formattedDeadline
    ? `trong vòng ${input.deadlineDays} ngày (trước ${formattedDeadline})`
    : `trong vòng ${input.deadlineDays} ngày kể từ khi nhận được thông báo này`;

  const bodyHtml = `
    <p>Xin chào <strong>${escapeHtml(input.candidateName)}</strong>,</p>
    <p>Chúc mừng bạn đã vượt qua vòng sơ tuyển hồ sơ cho vị trí <strong>${escapeHtml(input.jobTitle)}</strong>!</p>
    <p>Chúng tôi trân trọng mời bạn tham gia vòng <strong>phỏng vấn trực tuyến cùng AI</strong>. Bạn có thể chủ động vào phòng phỏng vấn bất cứ lúc nào thuận tiện <strong>${escapeHtml(deadlineSentence)}</strong>.</p>
    <div style="margin: 16px 0; padding: 12px 16px; background-color: #eff6ff; border-radius: 6px;">
      <p style="margin: 0 0 8px; font-weight: 600;">Lưu ý trước khi bắt đầu:</p>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Chuẩn bị <strong>micro</strong> hoạt động ổn định và không gian yên tĩnh.</li>
        <li>Nên sử dụng trình duyệt <strong>Google Chrome</strong> hoặc <strong>Safari</strong> phiên bản mới nhất.</li>
        <li>Nếu thiết bị gặp sự cố micro hoặc không tiện nói, bạn vẫn có thể chọn <strong>trả lời bằng chữ</strong> trong phòng phỏng vấn.</li>
      </ul>
    </div>
    ${hrMessage.html}
  `;

  const text = [
    `Xin chào ${input.candidateName},`,
    '',
    `Chúc mừng bạn đã vượt qua vòng sơ tuyển hồ sơ cho vị trí ${input.jobTitle}!`,
    `Chúng tôi trân trọng mời bạn tham gia vòng phỏng vấn trực tuyến cùng AI ${deadlineSentence}.`,
    '',
    'Lưu ý trước khi bắt đầu:',
    '- Chuẩn bị micro hoạt động ổn định và không gian yên tĩnh.',
    '- Nên sử dụng trình duyệt Google Chrome hoặc Safari phiên bản mới nhất.',
    '- Nếu không tiện dùng micro, bạn vẫn có thể trả lời bằng chữ trong phòng phỏng vấn.',
    hrMessage.text,
    `Vào phòng phỏng vấn tại: ${input.interviewUrl}`,
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  return {
    subject,
    html: wrapHtmlLayout(subject, bodyHtml, 'Vào phòng phỏng vấn', input.interviewUrl),
    text,
  };
}

export function buildCvRejectedEmail(input: ApplicationFeedbackTemplateInput): RenderedEmail {
  const subject = `[HireFlow] Kết quả vòng hồ sơ — ${input.jobTitle}`;
  const hrMessage = renderHrMessageBlock(input.candidateMessage);

  const bodyHtml = `
    <p>Xin chào <strong>${escapeHtml(input.candidateName)}</strong>,</p>
    <p>Cảm ơn bạn đã dành thời gian quan tâm và gửi hồ sơ ứng tuyển cho vị trí <strong>${escapeHtml(input.jobTitle)}</strong>.</p>
    <p>Sau khi xem xét kỹ lưỡng, chúng tôi rất tiếc phải thông báo hồ sơ của bạn hiện chưa phù hợp với yêu cầu của vị trí trong đợt tuyển dụng này.</p>
    <p>Bạn có thể xem nhận xét chi tiết mang tính xây dựng về hồ sơ tại đường dẫn bên dưới.</p>
    ${hrMessage.html}
  `;

  const text = [
    `Xin chào ${input.candidateName},`,
    '',
    `Cảm ơn bạn đã dành thời gian ứng tuyển vị trí ${input.jobTitle}.`,
    'Sau khi xem xét kỹ lưỡng, chúng tôi rất tiếc phải thông báo hồ sơ của bạn hiện chưa phù hợp trong đợt tuyển dụng này.',
    hrMessage.text,
    `Xem phản hồi chi tiết tại: ${input.feedbackUrl}`,
  ].join('\n');

  return {
    subject,
    html: wrapHtmlLayout(subject, bodyHtml, 'Xem phản hồi', input.feedbackUrl),
    text,
  };
}

export function buildInterviewPassedEmail(input: ApplicationFeedbackTemplateInput): RenderedEmail {
  const subject = `[HireFlow] Chúc mừng bạn đạt vòng phỏng vấn sơ bộ — ${input.jobTitle}`;
  const hrMessage = renderHrMessageBlock(input.candidateMessage);

  const bodyHtml = `
    <p>Xin chào <strong>${escapeHtml(input.candidateName)}</strong>,</p>
    <p>Chúc mừng bạn đã <strong>đạt vòng phỏng vấn sơ bộ</strong> cho vị trí <strong>${escapeHtml(input.jobTitle)}</strong>!</p>
    <p>Đội ngũ tuyển dụng sẽ sớm liên hệ trực tiếp với bạn để trao đổi về các bước tiếp theo. Trong lúc chờ đợi, bạn có thể xem phản hồi kỹ năng từ buổi phỏng vấn tại đường dẫn bên dưới.</p>
    ${hrMessage.html}
  `;

  const text = [
    `Xin chào ${input.candidateName},`,
    '',
    `Chúc mừng bạn đã đạt vòng phỏng vấn sơ bộ cho vị trí ${input.jobTitle}!`,
    'Nhà tuyển dụng sẽ sớm liên hệ với bạn về các bước tiếp theo.',
    hrMessage.text,
    `Xem phản hồi chi tiết tại: ${input.feedbackUrl}`,
  ].join('\n');

  return {
    subject,
    html: wrapHtmlLayout(subject, bodyHtml, 'Xem phản hồi', input.feedbackUrl),
    text,
  };
}

export function buildInterviewFailedEmail(input: ApplicationFeedbackTemplateInput): RenderedEmail {
  const subject = `[HireFlow] Kết quả vòng phỏng vấn sơ bộ — ${input.jobTitle}`;
  const hrMessage = renderHrMessageBlock(input.candidateMessage);

  const bodyHtml = `
    <p>Xin chào <strong>${escapeHtml(input.candidateName)}</strong>,</p>
    <p>Cảm ơn bạn đã dành thời gian tham gia buổi phỏng vấn sơ bộ cho vị trí <strong>${escapeHtml(input.jobTitle)}</strong>.</p>
    <p>Sau khi đánh giá tổng thể, chúng tôi rất tiếc phải thông báo bạn chưa đạt vòng phỏng vấn lần này. Chúng tôi đã tổng hợp một số góp ý kỹ năng hữu ích để đồng hành cùng bạn trong những cơ hội sắp tới.</p>
    ${hrMessage.html}
  `;

  const text = [
    `Xin chào ${input.candidateName},`,
    '',
    `Cảm ơn bạn đã tham gia vòng phỏng vấn sơ bộ cho vị trí ${input.jobTitle}.`,
    'Chúng tôi rất tiếc phải thông báo bạn chưa đạt vòng phỏng vấn lần này.',
    hrMessage.text,
    `Xem phản hồi kỹ năng tại: ${input.feedbackUrl}`,
  ].join('\n');

  return {
    subject,
    html: wrapHtmlLayout(subject, bodyHtml, 'Xem phản hồi', input.feedbackUrl),
    text,
  };
}

export function buildInterviewSubmittedEmail(
  input: InterviewSubmittedTemplateInput,
): RenderedEmail {
  const subject = `[HireFlow] Đã tiếp nhận bài phỏng vấn — ${input.jobTitle}`;

  const bodyHtml = `
    <p>Xin chào <strong>${escapeHtml(input.candidateName)}</strong>,</p>
    <p>Hệ thống đã tiếp nhận đầy đủ bài phỏng vấn AI của bạn cho vị trí <strong>${escapeHtml(input.jobTitle)}</strong>.</p>
    <p>Nhà tuyển dụng sẽ xem xét kết quả và gửi thông báo đến bạn trong thời gian sớm nhất. Bạn có thể theo dõi tiến độ bất cứ lúc nào tại mục <strong>Hồ sơ của tôi</strong>.</p>
  `;

  const text = [
    `Xin chào ${input.candidateName},`,
    '',
    `Hệ thống đã tiếp nhận đầy đủ bài phỏng vấn AI của bạn cho vị trí ${input.jobTitle}.`,
    'Nhà tuyển dụng sẽ xem xét và thông báo kết quả đến bạn sớm nhất.',
    '',
    `Theo dõi trạng thái hồ sơ tại: ${input.applicationsUrl}`,
  ].join('\n');

  return {
    subject,
    html: wrapHtmlLayout(subject, bodyHtml, 'Xem hồ sơ của tôi', input.applicationsUrl),
    text,
  };
}

export function buildPasswordResetOtpEmail(input: PasswordResetOtpTemplateInput): RenderedEmail {
  const subject = '[HireFlow] Mã OTP đặt lại mật khẩu';
  const text = [
    `Xin chào ${input.fullName},`,
    '',
    `Mã OTP đặt lại mật khẩu HireFlow của bạn là: ${input.otp}`,
    `Mã có hiệu lực trong ${input.expiresInMinutes} phút và chỉ dùng được một lần.`,
    '',
    'Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f9fafb; font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #1d4ed8; padding: 20px 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px;">HireFlow</h1>
    </div>
    <div style="padding: 24px;">
      <p>Xin chào <strong>${escapeHtml(input.fullName)}</strong>,</p>
      <p>Mã OTP đặt lại mật khẩu HireFlow của bạn là:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0; color: #1d4ed8;">${escapeHtml(input.otp)}</p>
      <p>Mã có hiệu lực trong <strong>${input.expiresInMinutes} phút</strong> và chỉ sử dụng một lần.</p>
      <p style="color: #6b7280; font-size: 13px;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    </div>
    <div style="padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
      Đây là email tự động từ hệ thống tuyển dụng HireFlow. Vui lòng không trả lời trực tiếp email này.
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
