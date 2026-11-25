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
  // Làm mới cả trang chi tiết: còn cache cũ (SCREENING_FAILED) thì trang đó không tự refetch.
  const refresh = (applicationId: string) =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.applications.byJob(jobId) }),
      client.invalidateQueries({ queryKey: queryKeys.applications.detail(applicationId) }),
    ]);
  return useMutation({
    ...options,
    mutationFn: rescreenApplication,
    onSuccess: async (data, applicationId, ...rest) => {
      toast.success('Đã gửi yêu cầu chấm lại CV');
      await refresh(applicationId);
      await options.onSuccess?.(data, applicationId, ...rest);
    },
    onError: async (error, applicationId, ...rest) => {
      const apiError = toApiError(error);
      toast.error(
        apiError.status === 409
          ? 'Hồ sơ đang được chấm hoặc đã có quyết định nên không thể chấm lại'
          : apiError.message,
      );
      await refresh(applicationId);
      await options.onError?.(error, applicationId, ...rest);
    },
  });
}
