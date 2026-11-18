import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { closeJob, createJob, getJob, getJobs, getMyJobs, updateJob } from '@/api/jobs';
import { queryKeys } from '@/api/queryKeys';
import type { Job, JobsParams, CreateJobRequest, UpdateJobRequest } from '@/types/jobs';

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

export function useMyJobs(params: JobsParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.jobs.mine(), params] as const,
    queryFn: ({ signal }) => getMyJobs(params, signal),
    // Keep the current page on screen while the next search/filter/page loads.
    placeholderData: keepPreviousData,
  });
}
export function useJob(id: string) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: ({ signal }) => getJob(id, signal),
    enabled: !!id,
  });
}
export function useUpdateJob(
  options: Omit<
    UseMutationOptions<Job, Error, { id: string; body: UpdateJobRequest }>,
    'mutationFn'
  > = {},
) {
  const client = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: ({ id, body }) => updateJob(id, body),
    onSuccess: async (job, variables, onMutateResult, mutationContext) => {
      await client.invalidateQueries({ queryKey: queryKeys.jobs.mine() });
      await client.invalidateQueries({ queryKey: queryKeys.jobs.detail(job.id) });
      await options.onSuccess?.(job, variables, onMutateResult, mutationContext);
    },
  });
}
export function useCloseJob(
  options: Omit<UseMutationOptions<Job, Error, string>, 'mutationFn'> = {},
) {
  const client = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: closeJob,
    onSuccess: async (job, id, onMutateResult, mutationContext) => {
      await client.invalidateQueries({ queryKey: queryKeys.jobs.mine() });
      await client.invalidateQueries({ queryKey: queryKeys.jobs.detail(job.id) });
      await options.onSuccess?.(job, id, onMutateResult, mutationContext);
    },
  });
}
