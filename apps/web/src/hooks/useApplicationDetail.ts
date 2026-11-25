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
    // Trang chi tiết tự hiện lỗi; tránh toast lặp lại mỗi 5 giây khi đang tự làm mới.
    meta: { errorMode: 'local' },
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
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.applications.detail(applicationId) }),
      jobId
        ? client.invalidateQueries({ queryKey: queryKeys.applications.byJob(jobId) })
        : undefined,
    ]);

  return useMutation({
    ...options,
    mutationFn: (payload: DecideApplicationPayload) => decideApplication(applicationId, payload),
    onSuccess: async (data, variables, onMutateResult, mutationContext) => {
      const msg =
        variables.decision === 'APPROVE'
          ? 'Đã duyệt hồ sơ và gửi lời mời phỏng vấn'
          : 'Đã loại hồ sơ ứng viên';
      toast.success(msg);
      await refresh();
      await options.onSuccess?.(data, variables, onMutateResult, mutationContext);
    },
    onError: async (error, variables, onMutateResult, mutationContext) => {
      const apiError = toApiError(error);
      // 409: hồ sơ không còn SCREENED (đã quyết định, hoặc đang được chấm lại ở nơi khác).
      toast.error(
        apiError.status === 409
          ? 'Hồ sơ đã được quyết định hoặc đang được chấm lại. Dữ liệu đã được tải lại.'
          : apiError.message,
      );
      await refresh();
      await options.onError?.(error, variables, onMutateResult, mutationContext);
    },
  });
}
