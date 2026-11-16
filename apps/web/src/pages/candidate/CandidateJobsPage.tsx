import { useState } from 'react';
import {
  ArrowRight,
  ArrowDownWideNarrow,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Clock,
  FileCheck2,
  FileText,
  Lightbulb,
  Mic,
  SearchX,
  Sparkles,
  Trophy,
  Upload,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchInput from '@/components/common/SearchInput';
import SegmentedControl from '@/components/common/SegmentedControl';
import SkillChip from '@/components/common/SkillChip';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCandidateProgress, type CandidateTone } from '@/lib/applicationStatus';
import { formatExperience, formatRelativeDate } from '@/lib/format';
import { mockJobs, mockMyApplications } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import type { Application } from '@/types/applications';
import type { Job } from '@/types/jobs';

type ExperienceFilter = 'all' | 'entry' | 'junior' | 'senior';
type SortKey = 'newest' | 'experience';

const EXPERIENCE_RANGE: Record<ExperienceFilter, (years: number) => boolean> = {
  all: () => true,
  entry: (years) => years === 0,
  junior: (years) => years >= 1 && years <= 2,
  senior: (years) => years >= 3,
};

const SORT_LABEL: Record<SortKey, string> = {
  newest: 'Mới nhất',
  experience: 'Kinh nghiệm thấp → cao',
};

const toneBadge: Record<CandidateTone, BadgeVariant> = {
  neutral: 'secondary',
  progress: 'warning',
  action: 'default',
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
          <Badge variant={toneBadge[progress.tone]} className="hidden shrink-0 sm:inline-flex">
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
                    : 'bg-primary',
              )}
            />
            Hồ sơ của bạn: {progress.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI đánh giá CV và phản hồi trong khoảng 1 phút
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
    ['SHORTLISTED', 'INTERVIEW_INVITED', 'INTERVIEWING'].includes(app.status),
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

const processSteps = [
  { icon: Upload, title: 'Nộp CV dạng PDF', text: 'Chọn vị trí phù hợp và tải CV lên.' },
  {
    icon: FileCheck2,
    title: 'AI đánh giá CV',
    text: 'Chấm điểm và đối chiếu kỹ năng trong ~1 phút.',
  },
  { icon: Mic, title: 'Phỏng vấn giọng nói với AI', text: '3–5 câu hỏi, khoảng 10 phút.' },
  {
    icon: Trophy,
    title: 'Nhận kết quả & góp ý',
    text: 'Biết rõ điểm mạnh và kỹ năng cần cải thiện.',
  },
];

function ProcessCard() {
  return (
    <Card className="p-5">
      <h3 className="text-card-title text-foreground">Quy trình ứng tuyển</h3>
      <ol className="relative mt-4 flex flex-col gap-4">
        <span className="absolute bottom-4 left-4 top-4 w-px bg-slate-200" aria-hidden />
        {processSteps.map(({ icon: Icon, title, text }, index) => (
          <li key={title} className="relative flex gap-3">
            <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                <span className="text-muted-foreground">{index + 1}. </span>
                {title}
              </p>
              <p className="text-xs text-slate-600">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function TipsCard() {
  return (
    <Card className="border-amber-200 bg-amber-50/60 p-5">
      <h3 className="flex items-center gap-2 text-card-title text-foreground">
        <Lightbulb className="h-5 w-5 text-amber-600" />
        Mẹo để CV được đánh giá tốt
      </h3>
      <ul className="mt-3 flex flex-col gap-2 text-slate-700">
        {[
          'Dùng PDF xuất từ Word/Google Docs, tránh ảnh scan.',
          'Ghi rõ tên kỹ năng giống trong tin tuyển dụng.',
          'Nêu số năm kinh nghiệm và kết quả cụ thể của từng dự án.',
        ].map((tip) => (
          <li key={tip} className="flex gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            {tip}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function CandidateJobsPage() {
  const [search, setSearch] = useState('');
  const [experience, setExperience] = useState<ExperienceFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  // TODO(W1-FE-05): load with getJobs({ status: 'OPEN', search }) and getMyApplications().
  const openJobs = mockJobs.filter((job) => job.status === 'OPEN');
  const applications = mockMyApplications;
  const appliedByJob = new Map(applications.map((app) => [app.job.id, app]));

  const query = search.trim().toLowerCase();
  const jobs = openJobs
    .filter(
      (job) =>
        EXPERIENCE_RANGE[experience](job.minYearsExperience) &&
        (!query ||
          job.title.toLowerCase().includes(query) ||
          [...job.requiredSkills, ...job.preferredSkills].some((skill) =>
            skill.toLowerCase().includes(query),
          )),
    )
    .sort((a, b) =>
      sort === 'newest'
        ? b.createdAt.localeCompare(a.createdAt)
        : a.minYearsExperience - b.minYearsExperience,
    );

  const resetFilters = () => {
    setSearch('');
    setExperience('all');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-page-title text-foreground">Việc làm đang tuyển</h1>
          <p className="mt-1 text-slate-600">
            Khám phá các vị trí phù hợp — AI sàng lọc minh bạch và phản hồi nhanh cho bạn
          </p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-md bg-indigo-50 px-3 py-1 text-xs font-medium text-slate-600 md:self-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Đang có {openJobs.length} vị trí mở
        </span>
      </div>

      <Card className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between lg:px-4">
        <SearchInput
          className="lg:w-[360px]"
          placeholder="Tìm vị trí hoặc kỹ năng (Node.js, React, SQL...)"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            ariaLabel="Lọc theo kinh nghiệm"
            value={experience}
            onChange={setExperience}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'entry', label: 'Chưa có KN' },
              { value: 'junior', label: '1–2 năm' },
              { value: 'senior', label: '3+ năm' },
            ]}
          />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs transition-colors hover:bg-slate-50">
              <ArrowDownWideNarrow className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{SORT_LABEL[sort]}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                <DropdownMenuItem key={key} onClick={() => setSort(key)}>
                  <span className="flex-1">{SORT_LABEL[key]}</span>
                  {key === sort && <Check className="!text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section className="flex flex-col gap-4 lg:col-span-8">
          <p className="text-xs text-muted-foreground">
            Hiển thị <strong className="font-semibold text-foreground">{jobs.length}</strong> vị trí
            phù hợp
          </p>
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <JobCard key={job.id} job={job} application={appliedByJob.get(job.id)} />
            ))
          ) : (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <SearchX className="mb-2 h-8 w-8 text-slate-400" />
              <p className="font-semibold text-foreground">Không tìm thấy vị trí phù hợp</p>
              <p className="mt-1 text-xs text-slate-600">
                Hãy thử từ khoá kỹ năng khác hoặc bỏ bớt bộ lọc
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4' })}
              >
                Xoá bộ lọc
              </button>
            </Card>
          )}
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:col-span-4">
          <MyApplicationsCard applications={applications} />
          <ProcessCard />
          <TipsCard />
        </aside>
      </div>
    </div>
  );
}
