import { useState, type ReactNode } from 'react';
import {
  CalendarDays,
  CircleCheck,
  FileText,
  Hourglass,
  Inbox,
  Info,
  Lightbulb,
  MessageSquareText,
  Play,
  Search,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import ApplicationSteps from '@/components/candidate/ApplicationSteps';
import EmptyState from '@/components/common/EmptyState';
import SegmentedControl from '@/components/common/SegmentedControl';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card } from '@/components/ui/card';
import { getCandidateProgress, type CandidateTone } from '@/lib/applicationStatus';
import { formatDate } from '@/lib/format';
import { mockJobs, mockMyApplications } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import type { Application } from '@/types/applications';

type Filter = 'all' | 'processing' | 'completed';

const isCompleted = (app: Application) => ['PASSED', 'FAILED', 'REJECTED'].includes(app.status);

const toneStyle: Record<CandidateTone, { pill: string; banner: string; icon: string }> = {
  neutral: {
    pill: 'border-slate-200 bg-slate-50 text-slate-700',
    banner: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: 'text-slate-500',
  },
  progress: {
    pill: 'border-amber-200 bg-amber-50 text-amber-700',
    banner: 'border-amber-200 bg-amber-100/70 text-amber-900',
    icon: 'text-amber-600',
  },
  action: {
    pill: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    banner: 'border-indigo-200 bg-indigo-50 text-indigo-900',
    icon: 'text-primary',
  },
  success: {
    pill: 'border-green-200 bg-green-50 text-green-700',
    banner: 'border-green-200 bg-green-100/70 text-green-900',
    icon: 'text-green-600',
  },
  failed: {
    pill: 'border-rose-200 bg-rose-50 text-rose-700',
    banner: 'border-rose-100 bg-rose-50 text-rose-900',
    icon: 'text-rose-600',
  },
};

function statusMessage(app: Application): { icon: typeof Info; text: string; action?: ReactNode } {
  const questions = mockJobs.find((job) => job.id === app.job.id)?.interviewQuestionCount ?? 3;
  // TODO(W3-FE-01/W3-FE-04): link to the interview room and result pages once they exist.
  const comingSoon = () => toast.info('Tính năng sẽ có ở Tuần 3');
  switch (app.status) {
    case 'SUBMITTED':
      return { icon: Inbox, text: 'Hồ sơ đã được tiếp nhận và sẽ sớm được AI đánh giá.' };
    case 'SCREENING':
    case 'SCREENED':
    case 'SCREENING_FAILED':
      return { icon: Hourglass, text: 'AI đang đánh giá CV, thường mất dưới 1 phút.' };
    case 'SHORTLISTED':
    case 'INTERVIEW_INVITED':
      return {
        icon: Sparkles,
        text: `Chúc mừng! Bạn được mời phỏng vấn với AI (${questions} câu hỏi, khoảng 10 phút).`,
        action: (
          <Button size="sm" className="h-9" onClick={comingSoon}>
            <Play />
            Vào phỏng vấn
          </Button>
        ),
      };
    case 'INTERVIEWING':
      return {
        icon: Sparkles,
        text: 'Bạn đang có một phiên phỏng vấn chưa hoàn thành.',
        action: (
          <Button size="sm" className="h-9" onClick={comingSoon}>
            <Play />
            Tiếp tục phỏng vấn
          </Button>
        ),
      };
    case 'EVALUATED':
      return {
        icon: Hourglass,
        text: 'Đã hoàn thành phỏng vấn. Nhà tuyển dụng đang xem xét kết quả.',
      };
    case 'PASSED':
      return {
        icon: CircleCheck,
        text: 'Bạn đã vượt qua vòng sơ tuyển. Nhà tuyển dụng sẽ liên hệ cho bước tiếp theo.',
        action: (
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-green-200 text-green-800 hover:bg-green-50"
            onClick={comingSoon}
          >
            <MessageSquareText />
            Xem phản hồi
          </Button>
        ),
      };
    case 'FAILED':
    case 'REJECTED':
      return {
        icon: Info,
        text: 'Hồ sơ chưa phù hợp với vị trí này. Hãy xem góp ý để chuẩn bị tốt hơn cho cơ hội sau.',
        action: (
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-rose-200 text-rose-800 hover:bg-rose-50"
            onClick={comingSoon}
          >
            <Lightbulb />
            Xem góp ý kỹ năng
          </Button>
        ),
      };
  }
}

function ApplicationCard({ app }: { app: Application }) {
  const progress = getCandidateProgress(app.status);
  const style = toneStyle[progress.tone];
  const message = statusMessage(app);
  const Icon = message.icon;
  return (
    <Card className="flex flex-col gap-6 p-6 transition-colors hover:border-slate-300">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-section-title text-foreground">{app.job.title}</h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Nộp ngày {formatDate(app.createdAt)}
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5 rounded border border-border bg-slate-50 px-2 py-0.5 font-medium">
              <FileText className="h-3.5 w-3.5 text-red-500" />
              {app.cvFileName}
            </span>
          </div>
        </div>
        <span
          className={cn(
            'flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-xs font-medium',
            style.pill,
          )}
        >
          {progress.tone === 'progress' && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          )}
          {progress.label}
        </span>
      </div>

      <ApplicationSteps progress={progress} />

      <div
        className={cn(
          'flex flex-col justify-between gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center',
          style.banner,
        )}
      >
        <div className="flex items-center gap-2.5 font-medium">
          <Icon
            className={cn(
              'h-[18px] w-[18px] shrink-0',
              style.icon,
              progress.tone === 'progress' && 'animate-pulse',
            )}
          />
          <p>{message.text}</p>
        </div>
        {message.action && <div className="shrink-0">{message.action}</div>}
      </div>
    </Card>
  );
}

export default function CandidateApplicationsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  // TODO(W2-FE-03): load with getMyApplications().
  const applications = mockMyApplications;
  const completed = applications.filter(isCompleted);
  const visible =
    filter === 'all'
      ? applications
      : filter === 'completed'
        ? completed
        : applications.filter((app) => !isCompleted(app));

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-page-title text-foreground">Hồ sơ của tôi</h1>
          <p className="mt-1 text-slate-600">
            Theo dõi tiến độ và kết quả đánh giá hồ sơ ứng tuyển
          </p>
        </div>
        {applications.length > 0 && (
          <SegmentedControl
            ariaLabel="Lọc hồ sơ"
            className="self-start sm:self-auto"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Tất cả', count: applications.length },
              {
                value: 'processing',
                label: 'Đang xử lý',
                count: applications.length - completed.length,
              },
              { value: 'completed', label: 'Đã hoàn thành', count: completed.length },
            ]}
          />
        )}
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Bạn chưa nộp hồ sơ nào"
          description="Khám phá các vị trí phù hợp và nộp CV để AI hỗ trợ kết nối nhanh chóng."
          action={
            <Link to="/candidate/jobs" className={buttonVariants({ size: 'sm', className: 'h-9' })}>
              <Search />
              Xem việc làm
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {visible.map((app) => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}
