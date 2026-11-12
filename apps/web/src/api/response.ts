import { ApiError, type ApiResponse, type PaginatedResponse } from '@/types/api';

export function unwrap<T>(body: ApiResponse<T>): T {
  if (!body || typeof body !== 'object' || !Object.hasOwn(body, 'data')) {
    throw new ApiError('Response API thiếu envelope data theo contract.', { kind: 'contract' });
  }
  return body.data;
}
export function paginated<T>(body: PaginatedResponse<T>): PaginatedResponse<T> {
  unwrap(body);
  if (
    !Array.isArray(body.data) ||
    !body.meta ||
    !['page', 'limit', 'total'].every(
      (key) => typeof body.meta[key as 'page' | 'limit' | 'total'] === 'number',
    )
  )
    throw new ApiError('Response API thiếu dữ liệu phân trang theo contract.', {
      kind: 'contract',
    });
  return body;
}
