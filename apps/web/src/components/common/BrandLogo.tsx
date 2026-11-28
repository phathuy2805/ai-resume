import CompanyLogo from '@/components/common/CompanyLogo';
import Logo from '@/components/common/Logo';
import { useCompany } from '@/hooks/useCompany';
import { companyDisplayName } from '@/lib/company';

/**
 * Logo + tên thương hiệu ở header / sidebar: dùng logo và tên ngắn của doanh nghiệp.
 * Chưa tải được thông tin công ty thì hiện logo HireFlow (nền tảng) như cũ.
 */
export default function BrandLogo() {
  const { data: company, isPending } = useCompany();

  if (isPending) {
    return (
      <span className="inline-flex items-center gap-2" aria-hidden="true">
        <span className="h-7 w-7 animate-pulse rounded-lg bg-slate-200" />
        <span className="h-4 w-24 animate-pulse rounded bg-slate-200" />
      </span>
    );
  }
  if (!company) return <Logo />;

  const name = companyDisplayName(company);
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <CompanyLogo
        key={company.logoUrl ?? 'initials'}
        name={name}
        logoUrl={company.logoUrl}
        className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-[11px] text-white"
      />
      <span className="truncate text-card-title tracking-tight text-foreground">{name}</span>
    </span>
  );
}
