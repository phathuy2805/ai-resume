import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Company, UpdateCompanyRequest } from '@/types/company';
import { unwrap } from './response';

export async function getCompany(signal?: AbortSignal): Promise<Company> {
  return unwrap((await apiClient.get<ApiResponse<Company>>('/company', { signal })).data);
}

/** HR/Admin: cập nhật từng phần thông tin doanh nghiệp. */
export async function updateCompany(body: UpdateCompanyRequest): Promise<Company> {
  return unwrap((await apiClient.patch<ApiResponse<Company>>('/company', body)).data);
}

/** HR/Admin: tải lên / thay logo (JPG, PNG, WebP tối đa 2MB). */
export async function uploadCompanyLogo(file: File): Promise<Company> {
  const body = new FormData();
  body.append('file', file);
  return unwrap((await apiClient.post<ApiResponse<Company>>('/company/logo', body)).data);
}

/** HR/Admin: xoá logo (quay về hiển thị chữ cái đầu). */
export async function deleteCompanyLogo(): Promise<Company> {
  return unwrap((await apiClient.delete<ApiResponse<Company>>('/company/logo')).data);
}
