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
      const hasPending = items.some(
        (app: JobApplicationListItem) => app.status === 'SUBMITTED' || app.status === 'SCREENING',
      );
      return hasPending ? 5000 : false;
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
    mutationFn: (applicationId: string) => rescreenApplication(applicationId),
    onSuccess: async (...args) => {
      // Invalidate the job applications query so status switches to SCREENING and triggers 5s polling
      await client.invalidateQueries({ queryKey: ['applications', jobId] });
      toast.success('Đã gửi yêu cầu chấm lại CV');
      await options.onSuccess?.(...args);
    },
    onError: (error, ...rest) => {
      const apiErr = toApiError(error);
      toast.error(apiErr.message || 'Không thể yêu cầu chấm lại CV');
      options.onError?.(error, ...rest);
    },
  });
}
