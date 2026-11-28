import { ArrowRight, Building2, CalendarDays, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import CompanyLogo from '@/components/common/CompanyLogo';
import { useCompany } from '@/hooks/useCompany';
import { companyCity, companyDisplayName } from '@/lib/company';

/**
 * Banner giới thiệu doanh nghiệp (trang việc làm, trang /company).
 * Đang tải: khung chờ. Lỗi: ẩn hẳn để không chặn nội dung chính của trang.
 * - `openJobs`: hiện ô "N vị trí đang mở" bên phải.
 * - `showCompanyLink`: hiện nút "Về công ty" bên phải (dùng ở trang việc làm).
 */
export default function CompanyBanner({
  openJobs,
  showCompanyLink = false,
  headingLevel = 'p',
}: {
  openJobs?: number;
  showCompanyLink?: boolean;
  /** Trang /company dùng h1 cho tên công ty; trang việc làm đã có h1 riêng. */
  headingLevel?: 'h1' | 'p';
}) {
  const { data: company, isPending } = useCompany();

  if (isPending) {
    return (
      <div
        aria-hidden="true"
        className="h-[176px] animate-pulse rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100"
      />
    );
  }
  if (!company) return null;

  const displayName = companyDisplayName(company);
  const Heading = headingLevel;
  const facts = [
    { icon: Building2, label: 'Lĩnh vực', value: company.industry },
    { icon: Users, label: 'Quy mô', value: company.companySize },
    { icon: MapPin, label: 'Trụ sở', value: companyCity(company.address) },
    {
      icon: CalendarDays,
      label: 'Năm thành lập',
      value: company.foundedYear ? `Thành lập ${company.foundedYear}` : null,
    },
  ].filter((fact): fact is typeof fact & { value: string } => Boolean(fact.value));

  return (
    <section
      aria-label={`Giới thiệu ${company.name}`}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white shadow-lg shadow-indigo-900/10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-400/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-indigo-400/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(rgb(255_255_255/0.14)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_left,black,transparent_70%)]"
      />

      <div className="relative flex flex-col gap-6 p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <CompanyLogo
              key={company.logoUrl ?? 'initials'}
              name={displayName}
              logoUrl={company.logoUrl}
              className="h-16 w-16 rounded-2xl bg-white text-lg text-indigo-700 shadow-lg shadow-indigo-950/20 ring-4 ring-white/15"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
                Tuyển dụng tại
              </p>
              <Heading className="mt-1 text-2xl font-semibold tracking-tight">
                {company.name}
              </Heading>
              {company.tagline && (
                <p className="mt-1 text-pretty text-indigo-100">{company.tagline}</p>
              )}
            </div>
          </div>

          {openJobs !== undefined && (
            <div className="flex shrink-0 items-baseline gap-2 self-start rounded-xl bg-white/10 px-5 py-3 ring-1 ring-inset ring-white/15 backdrop-blur md:flex-col md:items-center md:gap-0 md:self-auto">
              <span className="text-3xl font-semibold leading-none">{openJobs}</span>
              <span className="text-xs text-indigo-100 md:mt-1">vị trí đang mở</span>
            </div>
          )}
          {showCompanyLink && (
            <Link
              to="/company"
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 md:self-auto"
            >
              Về {displayName}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {facts.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Thông tin doanh nghiệp">
            {facts.map(({ icon: Icon, label, value }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/20"
              >
                <Icon className="h-3.5 w-3.5 text-indigo-200" aria-hidden="true" />
                <span className="sr-only">{label}: </span>
                {value}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
