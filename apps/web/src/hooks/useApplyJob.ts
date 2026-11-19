import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applyJob } from '@/api/applications';
import { queryKeys } from '@/api/queryKeys';
import { ApiError } from '@/types/api';
import type { Application, ApplyJobOptions } from '@/types/applications';

export function useApplyJob(userId: string, jobId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...queryKeys.applications.mine(userId), 'apply', jobId],
    mutationFn: async ({ file, ...options }: ApplyJobOptions & { file: File }) => {
      const result = await applyJob(jobId, file, options);
      if (!result || typeof result.id !== 'string' || result.job?.id !== jobId) {
        throw new ApiError(
          'Máy chủ trả kết quả nộp hồ sơ không hợp lệ. Hãy kiểm tra trạng thái trước khi nộp lại.',
          { kind: 'contract' },
        );
      }
      return result;
    },
    retry: false,
    meta: { errorMode: 'local' },
    onSuccess: (result) => {
      client.setQueryData<Application[]>(queryKeys.applications.mine(userId), (old) => [
        ...(old ?? []).filter((item) => item.job.id !== jobId),
        result,
      ]);
      void client.invalidateQueries({ queryKey: queryKeys.applications.mine(userId) });
    },
  });
}
