import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { getJobApplications, rescreenApplication } from '@/api/applications';
import { queryKeys } from '@/api/queryKeys';
import { toApiError } from '@/lib/apiError';
import type { GetJobApplicationsParams, JobApplicationListItem } from '@/types/applications';

export function useJobApplications(jobId: string, params: GetJobApplicationsParams = {}) {
  return useQuery({
    queryKey: queryKeys.applications.byJob(jobId, params),
    queryFn: ({ signal }) => getJobApplications(jobId, params, signal),
    placeholderData: keepPreviousData,
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const items = query.state.data?.data;
      if (!Array.isArray(items)) return false;
      return items.some(
        (item: JobApplicationListItem) =>
          item.status === 'SUBMITTED' || item.status === 'SCREENING',
      )
        ? 5000
        : false;
    },
  });
}

export function useRescreenApplication(
  jobId: string,
  options: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'> = {},
) {
  const client = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: rescreenApplication,
    onSuccess: async (...args) => {
      await client.invalidateQueries({ queryKey: ['applications', jobId] });
      toast.success('Đã gửi yêu cầu chấm lại CV');
      await options.onSuccess?.(...args);
    },
    onError: (error, ...rest) => {
      toast.error(toApiError(error).message || 'Không thể yêu cầu chấm lại CV');
      options.onError?.(error, ...rest);
    },
  });
}
