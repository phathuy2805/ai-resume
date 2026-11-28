import { Building2, MapPin, Users } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import ScreeningPreview from '@/components/auth/ScreeningPreview';
import CompanyLogo from '@/components/common/CompanyLogo';
import { useCompany } from '@/hooks/useCompany';
import type { Company } from '@/types/company';

const FALLBACK_NAME = 'HireFlow';
const FALLBACK_TAGLINE = 'Sàng lọc hồ sơ thông minh và minh bạch với AI';

const HIRING_STEPS = [
  {
    title: 'Nộp CV trực tuyến',
    text: 'Chọn vị trí phù hợp và tải CV PDF chỉ trong một phút.',
  },
  {
    title: 'AI sàng lọc minh bạch',
    text: 'Xem điểm phù hợp, điểm mạnh và kỹ năng còn thiếu của bạn.',
  },
  {
    title: 'Phỏng vấn AI linh hoạt',
    text: 'Trả lời câu hỏi bằng giọng nói vào thời điểm thuận tiện.',
  },
];

/** "Tầng 12, ..., TP. Hồ Chí Minh" -> "TP. Hồ Chí Minh" */
function cityOf(address: string | null): string | null {
  if (!address) return null;
  return address.split(',').at(-1)?.trim() || null;
}

function CompanyFacts({ company }: { company: Company }) {
  const facts = [
    { icon: Building2, value: company.industry },
    { icon: Users, value: company.companySize },
    { icon: MapPin, value: cityOf(company.address) },
  ].filter((fact): fact is { icon: typeof Building2; value: string } => Boolean(fact.value));
  if (facts.length === 0) return null;
  return (
    <ul className="mt-5 flex flex-wrap gap-2">
      {facts.map(({ icon: Icon, value }) => (
        <li
          key={value}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/20 backdrop-blur"
        >
          <Icon className="h-3.5 w-3.5 text-indigo-200" />
          {value}
        </li>
      ))}
    </ul>
  );
}

/*
 * Co giãn theo chiều cao màn hình (laptop thường chỉ ~700-800px):
 *  - < 900px: ẩn quy trình 3 bước, giữ minh hoạ.
 *  - < 620px: ẩn luôn minh hoạ.
 * Phần nội dung giữa luôn căn giữa theo chiều dọc nên không để lại khoảng trống.
 */
function BrandPanel() {
  const { data: company, isPending } = useCompany();
  const displayName = company?.shortName || company?.name || FALLBACK_NAME;

  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white lg:flex lg:flex-col lg:px-10 lg:py-9 xl:px-14 xl:py-10">
      {/* Nền: các mảng màu loang + chấm mờ */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-400/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-violet-500/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgb(255_255_255/0.14)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]"
      />

      {/* Header */}
      <div className="relative flex items-center gap-3">
        {isPending ? (
          <div className="h-10 w-10 animate-pulse rounded-xl bg-white/15" />
        ) : (
          <CompanyLogo
            name={displayName}
            logoUrl={company?.logoUrl}
            className="h-10 w-10 bg-white text-sm text-indigo-700 shadow-lg shadow-indigo-950/20"
          />
        )}
        <p className="text-sm">
          <span className="font-semibold text-white">{isPending ? ' ' : displayName}</span>
        </p>
      </div>

      <div className="relative flex flex-1 flex-col justify-center gap-10 py-8">
        {/* Giới thiệu */}
        <div>
          {isPending ? (
            <div className="space-y-3" aria-busy="true">
              <div className="h-3 w-32 animate-pulse rounded bg-white/15" />
              <div className="h-9 w-3/4 animate-pulse rounded bg-white/15" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
                Cơ hội nghề nghiệp
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white xl:text-4xl">
                {company ? (
                  <>
                    Gia nhập{' '}
                    <span className="bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent">
                      {displayName}
                    </span>
                  </>
                ) : (
                  FALLBACK_NAME
                )}
              </h2>
              <p className="mt-3 max-w-md text-pretty leading-relaxed text-indigo-100">
                {company?.tagline || FALLBACK_TAGLINE}
              </p>
              {company && <CompanyFacts company={company} />}
            </>
          )}
        </div>

        {/* Minh hoạ */}
        <div className="[@media(max-height:619px)]:hidden">
          <ScreeningPreview />
        </div>

        {/* Quy trình */}
        <div className="[@media(max-height:899px)]:hidden">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
            Quy trình tuyển dụng tinh gọn
          </p>
          <ol className="mt-4 space-y-3.5">
            {HIRING_STEPS.map(({ title, text }, index) => (
              <li key={title} className="flex gap-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white ring-1 ring-inset ring-white/25">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-0.5 text-[13px] text-indigo-200">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Footer */}
      <div className="relative flex justify-center border-t border-white/15 pt-5 text-center text-xs text-indigo-200">
        <span className="truncate">
          © {new Date().getFullYear()} {company?.name ?? FALLBACK_NAME}
        </span>
      </div>
    </aside>
  );
}

function MobileBrand() {
  const { data: company } = useCompany();
  const displayName = company?.shortName || company?.name || FALLBACK_NAME;
  return (
    <div className="mb-10 flex items-center gap-3 lg:hidden">
      <CompanyLogo
        name={displayName}
        logoUrl={company?.logoUrl}
        className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-violet-600 text-sm text-white"
      />
      <p className="text-sm">
        <span className="font-semibold text-foreground">{displayName}</span>
      </p>
    </div>
  );
}

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-card lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <BrandPanel />
      <main className="flex min-h-screen flex-col px-6 py-8 sm:px-10">
        <div className="flex flex-1 flex-col justify-center">
          <div className="mx-auto w-full max-w-[420px]">
            <MobileBrand />
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
