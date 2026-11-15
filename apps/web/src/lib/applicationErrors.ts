import { toApiError } from './apiError';
const messages: Record<string, string> = {
  SCANNED:
    'CV là bản scan. Hãy xuất lại PDF từ Word hoặc Google Docs để có thể chọn và sao chép chữ.',
  ENCRYPTED: 'PDF đang được bảo vệ bằng mật khẩu. Hãy bỏ mật khẩu rồi nộp lại.',
  CORRUPTED: 'File PDF bị lỗi hoặc không đọc được. Hãy xuất lại file và thử lại.',
  EMPTY: 'PDF không có nội dung văn bản để phân tích. Hãy kiểm tra và xuất lại CV.',
  TOO_MANY_PAGES: 'CV vượt quá số trang cho phép. Hãy rút gọn CV rồi nộp lại.',
  ALREADY_APPLIED: 'Bạn đã nộp hồ sơ cho vị trí này.',
  JOB_CLOSED: 'Vị trí này đã ngừng nhận hồ sơ.',
};
export function applicationFailure(cause: unknown) {
  const error = toApiError(cause);
  const closed = error.code === 'JOB_CLOSED' || error.status === 410;
  const duplicate = error.code === 'ALREADY_APPLIED';
  const uncertain =
    !closed &&
    !duplicate &&
    (error.status === 409 ||
      error.kind === 'network' ||
      error.kind === 'cancelled' ||
      error.kind === 'contract' ||
      (error.status ?? 0) >= 500);
  return {
    closed,
    duplicate,
    uncertain,
    message: closed
      ? messages.JOB_CLOSED
      : (error.code && messages[error.code]) ||
        (error.status === 413
          ? 'CV vượt quá dung lượng máy chủ cho phép. Hãy giảm dung lượng rồi nộp lại.'
          : uncertain
            ? 'Chưa xác nhận được kết quả nộp CV. Hãy kiểm tra trạng thái trước khi nộp lại.'
            : error.status === 404
              ? 'Tin tuyển dụng không còn tồn tại.'
              : error.message),
  };
}
