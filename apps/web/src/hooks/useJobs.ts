import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createJob, getJobs } from '@/api/jobs';
import { queryKeys } from '@/api/queryKeys';
import type { Job, JobsParams, CreateJobRequest } from '@/types/jobs';

export function useJobs(params: JobsParams = {}) {
  return useQuery({
    queryKey: queryKeys.jobs.list(params),
    queryFn: ({ signal }) => getJobs(params, signal),
  });
}
export function useCreateJob(
  options: Omit<UseMutationOptions<Job, Error, CreateJobRequest>, 'mutationFn'> = {},
) {
  const client = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: createJob,
    onSuccess: async (...args) => {
      await client.invalidateQueries({ queryKey: queryKeys.jobs.all });
      await options.onSuccess?.(...args);
    },
  });
}
