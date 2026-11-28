import type { ReactNode } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Globe,
  Heart,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import CompanyBanner from '@/components/candidate/CompanyBanner';
import QueryError from '@/components/common/QueryError';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompany } from '@/hooks/useCompany';
import { useJobs } from '@/hooks/useJobs';
import { prettyWebsite } from '@/lib/company';
import { formatExperience } from '@/lib/format';

const OPEN_JOBS_PREVIEW = 5;

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 flex items-center gap-2 text-card-title text-foreground">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </Card>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-3 leading-relaxed text-slate-700">
      {text
        .split('\n')
        .filter((line) => line.trim())
        .map((line, index) => (
          <p key={index}>{line}</p>
        ))}
    </div>
  );
}

function OpenJobsCard() {
  const jobs = useJobs({ page: 1, limit: OPEN_JOBS_PREVIEW });
  const items = jobs.data?.data ?? [];
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-card-title text-foreground">
        <BriefcaseBusiness className="h-5 w-5 text-primary" aria-hidden="true" />
        Vị trí đang tuyển
      </h2>
      {jobs.isPending ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : jobs.isError ? (
        <p className="mt-3 text-sm text-muted-foreground">Không tải được danh sách vị trí.</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Hiện chưa có vị trí nào đang mở.</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {items.map((job) => (
            <li key={job.id} className="py-2.5">
              <Link
                to={`/candidate/jobs/${job.id}`}
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                {job.title}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatExperience(job.minYearsExperience)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/candidate/jobs"
        className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4 w-full' })}
      >
        Xem tất cả việc làm
        <ArrowRight />
      </Link>
    </Card>
  );
}

/** Trang giới thiệu doanh nghiệp, công khai (khách chưa đăng nhập vẫn xem được). */
export default function CompanyPage() {
  const companyQuery = useCompany();
  const company = companyQuery.data;
  // Cùng query key với trang việc làm (page 1) nên dùng lại cache, chỉ cần meta.total.
  const openJobs = useJobs({ page: 1, limit: OPEN_JOBS_PREVIEW }).data?.meta.total;

  if (companyQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!company) {
    return (
      <QueryError
        message="Không tải được thông tin công ty."
        retry={() => void companyQuery.refetch()}
      />
    );
  }

  const contacts = [
    company.website && {
      icon: Globe,
      label: 'Website',
      value: prettyWebsite(company.website),
      href: company.website,
      external: true,
    },
    company.contactEmail && {
      icon: Mail,
      label: 'Email tuyển dụng',
      value: company.contactEmail,
      href: `mailto:${company.contactEmail}`,
    },
    company.phone && {
      icon: Phone,
      label: 'Điện thoại',
      value: company.phone,
      href: `tel:${company.phone.replace(/[^\d+]/g, '')}`,
    },
    company.address && { icon: MapPin, label: 'Địa chỉ', value: company.address },
  ].filter(Boolean) as {
    icon: LucideIcon;
    label: string;
    value: string;
    href?: string;
    external?: boolean;
  }[];

  return (
    <div className="flex flex-col gap-6">
      <CompanyBanner openJobs={openJobs} headingLevel="h1" />

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          {company.description && (
            <SectionCard icon={Sparkles} title="Giới thiệu">
              <Paragraphs text={company.description} />
            </SectionCard>
          )}
          {company.culture && (
            <SectionCard icon={Heart} title="Văn hoá & giá trị">
              <Paragraphs text={company.culture} />
            </SectionCard>
          )}
          {company.benefits.length > 0 && (
            <SectionCard icon={Check} title="Phúc lợi">
              <ul className="grid gap-3 sm:grid-cols-2">
                {company.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-3 rounded-lg border border-border bg-slate-50/60 p-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
          {!company.description && !company.culture && company.benefits.length === 0 && (
            <Card className="p-6 text-muted-foreground">
              Công ty chưa cập nhật thông tin giới thiệu.
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:col-span-4">
          {contacts.length > 0 && (
            <Card className="p-5">
              <h2 className="text-card-title text-foreground">Thông tin liên hệ</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {contacts.map(({ icon: Icon, label, value, href, external }) => (
                  <li key={label} className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      {href ? (
                        <a
                          href={href}
                          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          className="break-words font-medium text-foreground hover:text-primary"
                        >
                          {value}
                        </a>
                      ) : (
                        <p className="break-words font-medium text-foreground">{value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <OpenJobsCard />
        </aside>
      </div>
    </div>
  );
}
