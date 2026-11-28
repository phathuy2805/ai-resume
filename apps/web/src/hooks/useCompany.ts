import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCompanyLogo, getCompany, updateCompany, uploadCompanyLogo } from '@/api/company';
import { queryKeys } from '@/api/queryKeys';
import type { Company } from '@/types/company';

/** Thông tin doanh nghiệp gần như không đổi trong phiên làm việc nên cache lâu. */
export function useCompany() {
  return useQuery({
    queryKey: queryKeys.company.all,
    queryFn: ({ signal }) => getCompany(signal),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    // Không bật toast: banner/khối giới thiệu tự ẩn khi lỗi, trang cần dữ liệu tự hiển thị QueryError.
    meta: { errorMode: 'silent' },
  });
}

/** Ghi thẳng kết quả vào cache để banner / trang công ty cập nhật ngay, không cần refetch. */
function useSetCompanyCache() {
  const client = useQueryClient();
  return (company: Company) => client.setQueryData(queryKeys.company.all, company);
}

/** errorMode local: form tự hiển thị lỗi (400 -> dưới từng field, lỗi khác -> toast qua handleFormError). */
export function useUpdateCompany() {
  const setCompany = useSetCompanyCache();
  return useMutation({
    mutationFn: updateCompany,
    onSuccess: setCompany,
    meta: { errorMode: 'local' },
  });
}

export function useUploadCompanyLogo() {
  const setCompany = useSetCompanyCache();
  return useMutation({ mutationFn: uploadCompanyLogo, onSuccess: setCompany });
}

export function useDeleteCompanyLogo() {
  const setCompany = useSetCompanyCache();
  return useMutation({ mutationFn: deleteCompanyLogo, onSuccess: setCompany });
}
