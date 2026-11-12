import axios from 'axios';
import { ApiError } from '@/types/api';

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isCancel(error)) return new ApiError('Yêu cầu đã bị hủy.', { kind: 'cancelled' });
  if (axios.isAxiosError<unknown>(error)) {
    const status = error.response?.status;
    const raw = error.response?.data;
    const body = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
    const network =
      !error.response &&
      [
        'ERR_NETWORK',
        'ECONNABORTED',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'ENOTFOUND',
        'ECONNRESET',
      ].includes(error.code ?? '');
    const fallback =
      status === 403
        ? 'Bạn không có quyền thực hiện thao tác này.'
        : status === 401
          ? 'Vui lòng đăng nhập để tiếp tục.'
          : status && status >= 500
            ? 'Máy chủ gặp lỗi. Vui lòng thử lại sau.'
            : network
              ? 'Không thể kết nối máy chủ hoặc yêu cầu đã hết thời gian chờ.'
              : 'Không thể hoàn thành yêu cầu. Vui lòng thử lại.';
    return new ApiError(
      typeof body.message === 'string' && body.message.trim() ? body.message : fallback,
      {
        status,
        kind: status ? 'http' : network ? 'network' : 'unknown',
        errors: Array.isArray(body.errors)
          ? body.errors.filter((e): e is string => typeof e === 'string')
          : [],
        timestamp: typeof body.timestamp === 'string' ? body.timestamp : undefined,
      },
    );
  }
  return new ApiError('Đã xảy ra lỗi không mong muốn.', { kind: 'unknown' });
}
