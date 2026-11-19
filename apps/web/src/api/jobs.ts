import { apiClient } from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { Job, JobsParams, CreateJobRequest, UpdateJobRequest } from '@/types/jobs';
import { paginated, unwrap } from './response';

export async function getJobs(
  params: JobsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResponse<Job>> {
  return paginated((await apiClient.get<PaginatedResponse<Job>>('/jobs', { params, signal })).data);
}
export async function getJob(id: string, signal?: AbortSignal): Promise<Job> {
  return unwrap(
    (await apiClient.get<ApiResponse<Job>>(`/jobs/${encodeURIComponent(id)}`, { signal })).data,
  );
}
export async function getMyJobs(
  params: JobsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResponse<Job>> {
  return paginated(
    (await apiClient.get<PaginatedResponse<Job>>('/jobs/mine', { params, signal })).data,
  );
}
/** HR view of one of their own jobs (OPEN or CLOSED), including AI config. */
export async function getMyJob(id: string, signal?: AbortSignal): Promise<Job> {
  return unwrap(
    (await apiClient.get<ApiResponse<Job>>(`/jobs/mine/${encodeURIComponent(id)}`, { signal }))
      .data,
  );
}
export async function createJob(body: CreateJobRequest): Promise<Job> {
  return unwrap((await apiClient.post<ApiResponse<Job>>('/jobs', body)).data);
}
export async function updateJob(id: string, body: UpdateJobRequest): Promise<Job> {
  return unwrap(
    (await apiClient.patch<ApiResponse<Job>>(`/jobs/${encodeURIComponent(id)}`, body)).data,
  );
}
export async function closeJob(id: string): Promise<Job> {
  return unwrap(
    (await apiClient.patch<ApiResponse<Job>>(`/jobs/${encodeURIComponent(id)}/close`)).data,
  );
}
export async function reopenJob(id: string): Promise<Job> {
  return unwrap(
    (await apiClient.patch<ApiResponse<Job>>(`/jobs/${encodeURIComponent(id)}/reopen`)).data,
  );
}
