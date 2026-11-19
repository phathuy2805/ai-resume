import { useQuery } from '@tanstack/react-query';
import { getMyApplications } from '@/api/applications';
import { queryKeys } from '@/api/queryKeys';
import { ApiError } from '@/types/api';

export async function fetchMyApplications(signal?: AbortSignal) {
  const rows = await getMyApplications(signal);
  if (
    !Array.isArray(rows) ||
    rows.some((row) => !row || typeof row.id !== 'string' || typeof row.job?.id !== 'string')
  ) {
    throw new ApiError('Không đọc được trạng thái hồ sơ. Vui lòng thử lại.', { kind: 'contract' });
  }
  return rows;
}
export function useMyApplications(userId?: string) {
  return useQuery({
    queryKey: queryKeys.applications.mine(userId),
    queryFn: ({ signal }) => fetchMyApplications(signal),
    enabled: !!userId,
    meta: { errorMode: 'local' },
  });
}
