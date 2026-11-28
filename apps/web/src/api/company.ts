import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Company } from '@/types/company';
import { unwrap } from './response';

export async function getCompany(signal?: AbortSignal): Promise<Company> {
  return unwrap((await apiClient.get<ApiResponse<Company>>('/company', { signal })).data);
}
