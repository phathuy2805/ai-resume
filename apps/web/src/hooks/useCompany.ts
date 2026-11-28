import { useQuery } from '@tanstack/react-query';
import { getCompany } from '@/api/company';
import { queryKeys } from '@/api/queryKeys';

/** Thông tin doanh nghiệp gần như không đổi trong phiên làm việc nên cache lâu. */
export function useCompany() {
  return useQuery({
    queryKey: queryKeys.company.all,
    queryFn: ({ signal }) => getCompany(signal),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
