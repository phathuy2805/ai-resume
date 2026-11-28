import { ArrowRight, Building2, Check, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import CompanyLogo from '@/components/common/CompanyLogo';
import { Card } from '@/components/ui/card';
import { useCompany } from '@/hooks/useCompany';
import { companyCity, companyDisplayName } from '@/lib/company';

const MAX_BENEFITS = 3;

/** Khối "Về công ty" trong chi tiết việc làm. Lỗi / chưa có dữ liệu thì ẩn. */
export default function AboutCompanyCard() {
  const { data: company } = useCompany();
  if (!company) return null;

  const displayName = companyDisplayName(company);
  const facts = [
    { icon: Building2, value: company.industry },
    { icon: Users, value: company.companySize },
    { icon: MapPin, value: companyCity(company.address) },
  ].filter((fact): fact is typeof fact & { value: string } => Boolean(fact.value));
  const benefits = company.benefits.slice(0, MAX_BENEFITS);
  const moreBenefits = company.benefits.length - benefits.length;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h2 className="text-card-title text-foreground">Về công ty</h2>
      <div className="flex items-center gap-3">
        <CompanyLogo
          key={company.logoUrl ?? 'initials'}
          name={displayName}
          logoUrl={company.logoUrl}
          className="h-12 w-12 bg-gradient-to-br from-indigo-600 to-violet-600 text-sm text-white"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{company.name}</p>
          {company.tagline && (
            <p className="truncate text-xs text-muted-foreground">{company.tagline}</p>
          )}
        </div>
      </div>

      {facts.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
          {facts.map(({ icon: Icon, value }) => (
            <li key={value} className="inline-flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              {value}
            </li>
          ))}
        </ul>
      )}

      {company.description && (
        <p className="line-clamp-4 leading-relaxed text-slate-600">{company.description}</p>
      )}

      {benefits.length > 0 && (
        <div className="border-t border-border pt-4">
          <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Phúc lợi nổi bật
          </span>
          <ul className="flex flex-col gap-2">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
          {moreBenefits > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">+{moreBenefits} phúc lợi khác</p>
          )}
        </div>
      )}

      <Link
        to="/company"
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        Xem trang công ty
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}
