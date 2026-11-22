import { apiClient } from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type {
  Application,
  ApplicationDetail,
  ApplyJobOptions,
  CvUrlResult,
  DecideApplicationPayload,
  DecisionResult,
  GetJobApplicationsParams,
  JobApplicationListItem,
} from '@/types/applications';
import { paginated, unwrap } from './response';

export async function applyJob(
  jobId: string,
  file: File,
  options: ApplyJobOptions = {},
): Promise<Application> {
  const body = new FormData();
  body.append('file', file);
  const response = await apiClient.post<ApiResponse<Application>>(
    `/jobs/${encodeURIComponent(jobId)}/applications`,
    body,
    {
      signal: options.signal,
      onUploadProgress: (event) => {
        const total = event.total && event.total > 0 ? event.total : undefined;
        options.onUploadProgress?.({
          loaded: event.loaded,
          total,
          percent: total ? Math.min(100, Math.round((event.loaded / total) * 100)) : undefined,
        });
      },
    },
  );
  return unwrap(response.data);
}

export async function getMyApplications(signal?: AbortSignal): Promise<Application[]> {
  return unwrap(
    (await apiClient.get<ApiResponse<Application[]>>('/me/applications', { signal })).data,
  );
}

/** HR: Get applications of a job with filters and pagination. */
export async function getJobApplications(
  jobId: string,
  params: GetJobApplicationsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResponse<JobApplicationListItem>> {
  const response = await apiClient.get<PaginatedResponse<JobApplicationListItem>>(
    `/jobs/${encodeURIComponent(jobId)}/applications`,
    { params, signal },
  );
  return paginated(response.data);
}

export async function rescreenApplication(applicationId: string): Promise<void> {
  await apiClient.post(`/applications/${encodeURIComponent(applicationId)}/rescreen`);
}

/** HR: Get detailed application data (candidate, job, breakdown, explanation, decision). */
export async function getApplication(id: string, signal?: AbortSignal): Promise<ApplicationDetail> {
  const response = await apiClient.get<ApiResponse<ApplicationDetail>>(
    `/applications/${encodeURIComponent(id)}`,
    { signal },
  );
  return unwrap(response.data);
}

/** HR: Get presigned signed URL to view/download original CV. */
export async function getCvUrl(id: string, signal?: AbortSignal): Promise<CvUrlResult> {
  const response = await apiClient.get<ApiResponse<CvUrlResult>>(
    `/applications/${encodeURIComponent(id)}/cv-url`,
    { signal },
  );
  return unwrap(response.data);
}

/** HR: Submit hiring decision (APPROVE / REJECT) for an application in SCREENED status. */
export async function decideApplication(
  id: string,
  payload: DecideApplicationPayload,
): Promise<DecisionResult> {
  const response = await apiClient.post<ApiResponse<DecisionResult>>(
    `/applications/${encodeURIComponent(id)}/decision`,
    payload,
  );
  return unwrap(response.data);
}
