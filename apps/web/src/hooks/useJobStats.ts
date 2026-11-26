import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getJobStats } from '@/api/jobs';
import { queryKeys } from '@/api/queryKeys';

export function useJobStats(jobId: string) {
  return useQuery({
    queryKey: queryKeys.applications.stats(jobId),
    queryFn: ({ signal }) => getJobStats(jobId, signal),
    enabled: Boolean(jobId),
    // The page renders QueryError with a retry button, so no global toast.
    meta: { errorMode: 'local' },
    // Keep the previous job's numbers on screen while the newly selected job loads.
    placeholderData: keepPreviousData,
    // Same rule as the candidates list: auto-refresh only while CVs are still being screened.
    refetchInterval: (query) => {
      const byStatus = query.state.data?.byStatus;
      if (!byStatus) return false;
      return byStatus.SUBMITTED + byStatus.SCREENING > 0 ? 5000 : false;
    },
  });
}
