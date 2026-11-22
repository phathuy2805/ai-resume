import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { decideApplication, getApplication } from '@/api/applications';
import { queryKeys } from '@/api/queryKeys';
import { toApiError } from '@/lib/apiError';
import type { DecideApplicationPayload, DecisionResult } from '@/types/applications';

export function useApplication(id: string) {
  return useQuery({
    queryKey: queryKeys.applications.detail(id),
    queryFn: ({ signal }) => getApplication(id, signal),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'SUBMITTED' || status === 'SCREENING' ? 5000 : false;
    },
  });
}

export function useDecideApplication(
  applicationId: string,
  jobId?: string,
  options: Omit<
    UseMutationOptions<DecisionResult, Error, DecideApplicationPayload>,
    'mutationFn'
  > = {},
) {
  const client = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (payload: DecideApplicationPayload) => decideApplication(applicationId, payload),
    onSuccess: async (data, variables, onMutateResult, mutationContext) => {
      const msg =
        variables.decision === 'APPROVE'
          ? 'Đã duyệt hồ sơ và gửi lời mời phỏng vấn'
          : 'Đã loại hồ sơ ứng viên';
      toast.success(msg);
      await client.invalidateQueries({ queryKey: queryKeys.applications.detail(applicationId) });
      if (jobId) {
        await client.invalidateQueries({ queryKey: ['applications', jobId] });
      }
      await options.onSuccess?.(data, variables, onMutateResult, mutationContext);
    },
    onError: async (error, variables, onMutateResult, mutationContext) => {
      const apiErr = toApiError(error);
      const isConflict = apiErr.status === 409;
      toast.error(
        apiErr.message ||
          (isConflict ? 'Hồ sơ đã được quyết định trước đó' : 'Không thể lưu quyết định hồ sơ'),
      );
      // Invalidate on conflict to sync state
      await client.invalidateQueries({ queryKey: queryKeys.applications.detail(applicationId) });
      if (jobId) {
        await client.invalidateQueries({ queryKey: ['applications', jobId] });
      }
      options.onError?.(error, variables, onMutateResult, mutationContext);
    },
  });
}
