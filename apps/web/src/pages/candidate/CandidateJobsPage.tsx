import { ArrowRight, Bot, BriefcaseBusiness, Check, Clock, SearchX, Sparkles } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SearchInput from '@/components/common/SearchInput';
import EmptyState from '@/components/common/EmptyState';
import QueryError from '@/components/common/QueryError';
import SkillChip from '@/components/common/SkillChip';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getCandidateProgress, type CandidateTone } from '@/lib/candidateStatus';
import { formatExperience, formatRelativeDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMyApplications } from '@/hooks/useMyApplications';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getJobs } from '@/api/jobs';
import { queryKeys } from '@/api/queryKeys';
import type { Application } from '@/types/applications';
import type { PublicJob as Job } from '@/types/jobs';

/** Cùng quy ước màu với trang Hồ sơ của tôi: đang chờ xanh dương, đạt xanh lá, thất bại đỏ. */
const toneBadge: Record<CandidateTone, BadgeVariant> = {
  neutral: 'secondary',
  progress: 'info',
  action: 'infoSolid',
  success: 'success',
  failed: 'danger',
};

const isNew = (job: Job) => Date.now() - new Date(job.createdAt).getTime() < 3 * 86_400_000;

function firstSentence(description: string) {
  return description.split('\n').find((line) => line.trim()) ?? '';
}

function JobCard({ job, application }: { job: Job; application?: Application }) {
  const progress = application && getCandidateProgress(application.status);
  const extraSkills = job.preferredSkills.length;
  return (
    <Card className="group flex flex-col gap-4 p-6 transition-all hover:border-indigo-200 hover:shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-primary">
          <BriefcaseBusiness className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-card-title text-foreground">
              <Link
                to={`/candidate/jobs/${job.id}`}
                className="transition-colors group-hover:text-primary"
              >
                {job.title}
              </Link>
            </h2>
            {isNew(job) && <Badge variant="success">Mới</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              {formatExperience(job.minYearsExperience)}
            </span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1">
              <Bot className="h-3.5 w-3.5" />
              Phỏng vấn AI {job.interviewQuestionCount} câu
            </span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Đăng {formatRelativeDate(job.createdAt)}
            </span>
          </div>
        </div>
        {progress && (
          <Badge variant="success" className="shrink-0">
            <Check />
            Đã nộp
          </Badge>
        )}
      </div>

      <p className="line-clamp-2 leading-relaxed text-slate-600">
        {firstSentence(job.description)}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {job.requiredSkills.slice(0, 5).map((skill) => (
          <SkillChip key={skill} variant="required">
            {skill}
          </SkillChip>
        ))}
        {extraSkills > 0 && (
          <span className="text-xs text-muted-foreground">+{extraSkills} kỹ năng ưu tiên</span>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        {progress ? (
          <Link
            to="/candidate/applications"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-primary"
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                progress.tone === 'failed'
                  ? 'bg-rose-500'
                  : progress.tone === 'success'
                    ? 'bg-green-500'
                    : 'bg-blue-500',
              )}
            />
            Hồ sơ của bạn: {progress.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Xem yêu cầu và nộp CV PDF
          </span>
        )}
        <div className="flex gap-2">
          <Link
            to={`/candidate/jobs/${job.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Xem chi tiết
          </Link>
          {!application && (
            <Link to={`/candidate/jobs/${job.id}`} className={buttonVariants({ size: 'sm' })}>
              Ứng tuyển ngay
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

function MyApplicationsCard({ applications }: { applications: Application[] }) {
  const inProgress = applications.filter(
    (app) => !['PASSED', 'FAILED', 'REJECTED'].includes(app.status),
  ).length;
  const invited = applications.filter((app) =>
    ['INTERVIEW_INVITED', 'INTERVIEWING'].includes(app.status),
  ).length;
  return (
    <Card className="p-5">
      <h3 className="text-card-title text-foreground">Hồ sơ của bạn</h3>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Đã nộp', value: applications.length },
          { label: 'Đang xử lý', value: inProgress },
          { label: 'Mời PV', value: invited },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-slate-50 px-2 py-3">
            <div className="text-section-title text-foreground">{item.value}</div>
            <div className="text-[11px] text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>
      {applications.length > 0 ? (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {applications.slice(0, 3).map((app) => {
            const progress = getCandidateProgress(app.status);
            return (
              <li key={app.id} className="flex items-center justify-between gap-2 py-2.5">
                <span className="truncate font-medium text-foreground">{app.job.title}</span>
                <Badge variant={toneBadge[progress.tone]} className="shrink-0">
                  {progress.label}
                </Badge>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          Bạn chưa nộp hồ sơ nào. Chọn một vị trí bên trái để bắt đầu.
        </p>
      )}
      <Link
        to="/candidate/applications"
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        Xem tất cả hồ sơ
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}

const LIMIT = 6;
export default function CandidateJobsPage() {
  const [url, setUrl] = useSearchParams();
  const search = (url.get('search') ?? '').slice(0, 200);
  const debounced = useDebouncedValue(search, 300);
  const rawPage = Number(url.get('page') ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const pendingSearch = search !== debounced;
  // BE-04's public endpoint returns OPEN jobs; status is only an HR filter.
  const params = { search: debounced.trim(), page, limit: LIMIT };
  const jobs = useQuery({
    queryKey: queryKeys.jobs.list(params),
    queryFn: ({ signal }) => getJobs(params, signal),
    enabled: !pendingSearch,
    meta: { errorMode: 'local' },
  });
  const session = useCurrentUser();
  const applications = useMyApplications(
    session.user?.role === 'CANDIDATE' ? session.user.id : undefined,
  );
  const appliedByJob = new Map(applications.data?.map((app) => [app.job.id, app]));
  const total = jobs.data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const changePage = (next: number) =>
    setUrl((current) => {
      const updated = new URLSearchParams(current);
      updated.set('page', String(next));
      return updated;
    });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Việc làm đang tuyển</h1>
        <p className="mt-1 text-slate-600">Tìm vị trí phù hợp và nộp CV của bạn.</p>
      </div>
      <Card className="p-4">
        <SearchInput
          aria-label="Tìm việc theo tên"
          placeholder="Tìm theo tên công việc…"
          maxLength={200}
          value={search}
          onChange={(event) => {
            const next = new URLSearchParams(url);
            next.set('search', event.target.value);
            next.set('page', '1');
            setUrl(next, { replace: true });
          }}
        />
      </Card>
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <section
          aria-label="Danh sách việc làm"
          className="space-y-4 lg:col-span-8"
          aria-busy={jobs.isFetching || pendingSearch}
        >
          {pendingSearch || jobs.isPending ? (
            <p role="status">Đang tìm việc làm…</p>
          ) : jobs.isError ? (
            <QueryError
              message="Không tải được danh sách việc làm."
              retry={() => void jobs.refetch()}
            />
          ) : (
            <>
              <p className="text-sm text-slate-600">
                {total} vị trí đang mở · Trang {page}/{pages}
              </p>
              {jobs.isFetching && <p role="status">Đang cập nhật…</p>}
              {jobs.data?.data.length ? (
                jobs.data.data
                  .filter((job) => job.status === 'OPEN')
                  .map((job) => (
                    <JobCard key={job.id} job={job} application={appliedByJob.get(job.id)} />
                  ))
              ) : (
                <EmptyState
                  icon={SearchX}
                  title={
                    page > 1 ? 'Trang này không có việc làm' : 'Không tìm thấy việc làm phù hợp'
                  }
                  description="Hãy thử từ khóa khác hoặc quay về trang đầu."
                  action={
                    <Button variant="outline" onClick={() => setUrl({})}>
                      Xóa tìm kiếm
                    </Button>
                  }
                />
              )}
              <nav
                aria-label="Phân trang việc làm"
                className="flex items-center justify-between gap-3"
              >
                <Button
                  variant="outline"
                  disabled={page <= 1 || jobs.isFetching}
                  onClick={() => changePage(page - 1)}
                >
                  Trang trước
                </Button>
                <span className="text-sm">Trang {page}</span>
                <Button
                  variant="outline"
                  disabled={page >= pages || jobs.isFetching}
                  onClick={() => changePage(page + 1)}
                >
                  Trang sau
                </Button>
              </nav>
            </>
          )}
        </section>
        <aside className="space-y-4 lg:col-span-4">
          {session.isLoading ? (
            <p role="status">Đang xác minh tài khoản…</p>
          ) : session.error ? (
            <QueryError message="Không tải được tài khoản." retry={() => void session.retry()} />
          ) : session.user?.role === 'CANDIDATE' ? (
            applications.isPending ? (
              <p role="status">Đang tải hồ sơ đã nộp…</p>
            ) : applications.isError ? (
              <QueryError
                message="Không tải được trạng thái hồ sơ đã nộp."
                retry={() => void applications.refetch()}
              />
            ) : (
              <MyApplicationsCard applications={applications.data ?? []} />
            )
          ) : (
            <Card className="p-5">
              <h2 className="text-card-title">Ứng tuyển bằng CV</h2>
              <p className="mt-2 text-slate-600">
                Chọn việc làm để xem chi tiết. Đăng nhập bằng tài khoản ứng viên khi bạn muốn nộp
                CV.
              </p>
            </Card>
          )}
          <Card className="p-5">
            <h2 className="text-card-title">Chuẩn bị CV</h2>
            <p className="mt-2 text-slate-600">
              Dùng PDF xuất từ Word hoặc Google Docs, có thể chọn chữ, tối đa 5MB.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
