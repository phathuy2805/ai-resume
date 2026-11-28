import { useState, type ReactNode } from 'react';
import {
  CalendarDays,
  CircleCheck,
  Clock3,
  FileText,
  Hourglass,
  Inbox,
  Info,
  MessageSquareText,
  Play,
  Search,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ApplicationSteps from '@/components/candidate/ApplicationSteps';
import EmptyState from '@/components/common/EmptyState';
import SegmentedControl from '@/components/common/SegmentedControl';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getCandidateProgress, type CandidateTone } from '@/lib/candidateStatus';
import { formatDate } from '@/lib/format';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMyApplications } from '@/hooks/useMyApplications';
import QueryError from '@/components/common/QueryError';
import { candidateLoginUrl } from '@/lib/loginRedirect';
import { cn } from '@/lib/utils';
import type { Application } from '@/types/applications';

type Filter = 'all' | 'processing' | 'completed';

const isCompleted = (app: Application) => ['PASSED', 'FAILED', 'REJECTED'].includes(app.status);

/** Đang chờ = xanh dương, thành công = xanh lá, thất bại = đỏ (khớp màu timeline). */
const toneStyle: Record<
  CandidateTone,
  { pill: string; dot: string; banner: string; icon: string }
> = {
  neutral: {
    pill: 'border-slate-200 bg-slate-50 text-slate-700',
    dot: 'bg-slate-400',
    banner: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: 'text-slate-500',
  },
  progress: {
    pill: 'border-blue-200 bg-blue-50 text-blue-700',
    dot: 'animate-pulse bg-blue-500',
    banner: 'border-blue-200 bg-blue-50 text-blue-900',
    icon: 'text-blue-600',
  },
  // Được mời phỏng vấn: vẫn là đang chờ nhưng cần ứng viên hành động nên đậm hơn.
  action: {
    pill: 'border-blue-600 bg-blue-600 text-white',
    dot: 'bg-white',
    banner: 'border-blue-200 bg-blue-50 text-blue-900',
    icon: 'text-blue-600',
  },
  success: {
    pill: 'border-green-200 bg-green-50 text-green-700',
    dot: 'bg-green-500',
    banner: 'border-green-200 bg-green-100/70 text-green-900',
    icon: 'text-green-600',
  },
  failed: {
    pill: 'border-rose-200 bg-rose-50 text-rose-700',
    dot: 'bg-rose-500',
    banner: 'border-rose-100 bg-rose-50 text-rose-900',
    icon: 'text-rose-600',
  },
};

function statusMessage(app: Application): { icon: typeof Info; text: string; action?: ReactNode } {
  const interviewId = app.interview?.id ?? app.interviewId;
  const interviewTarget = interviewId ? `/candidate/interviews/${interviewId}` : null;
  const feedbackTarget = `/candidate/applications/${app.id}/feedback`;
  const interviewPhase = app.interview?.phase;
  const inviteExpiresAt = app.interview?.inviteExpiresAt ?? app.interviewExpiresAt;
  const isInviteExpired =
    app.status === 'INTERVIEW_INVITED' &&
    inviteExpiresAt != null &&
    Date.parse(inviteExpiresAt) <= Date.now();

  if (interviewPhase === 'SUBMITTED') {
    const hasFinalResult = app.status === 'PASSED' || app.status === 'FAILED';
    return {
      icon: hasFinalResult ? CircleCheck : Hourglass,
      text: hasFinalResult
        ? app.status === 'PASSED'
          ? 'Bạn đã hoàn thành phỏng vấn và đạt yêu cầu tuyển dụng.'
          : 'Bạn đã hoàn thành phỏng vấn. Hãy xem phản hồi về kết quả.'
        : 'Đã hoàn thành phỏng vấn, đang chờ kết quả.',
      action: interviewTarget ? (
        <div className="flex flex-wrap gap-2">
          <Link
            to={interviewTarget}
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'h-9 shrink-0',
            })}
          >
            Xem lại câu trả lời
          </Link>
          {hasFinalResult && (
            <Link
              to={feedbackTarget}
              className={buttonVariants({
                variant: 'outline',
                size: 'sm',
                className: 'h-9 shrink-0',
              })}
            >
              Xem phản hồi
            </Link>
          )}
        </div>
      ) : undefined,
    };
  }

  if (interviewPhase === 'EXPIRED' || isInviteExpired) {
    return { icon: Clock3, text: 'Đã quá hạn phỏng vấn.' };
  }

  switch (app.status) {
    case 'SUBMITTED':
      return {
        icon: Inbox,
        text: 'Hồ sơ đã được tiếp nhận và đang trong quá trình xét duyệt.',
      };
    case 'SCREENING':
    case 'SCREENED':
    case 'SCREENING_FAILED':
    case 'SHORTLISTED':
      return {
        icon: Hourglass,
        text: 'Hồ sơ của bạn đang được xét duyệt. Vui lòng chờ thông báo kết quả.',
      };
    case 'REJECTED':
      return {
        icon: Info,
        text: 'Hồ sơ chưa phù hợp với vị trí này. Cảm ơn bạn đã quan tâm ứng tuyển.',
      };
    case 'INTERVIEW_INVITED':
      return {
        icon: Sparkles,
        text: 'Chúc mừng! Bạn đã được mời tham gia vòng phỏng vấn.',
        action: interviewTarget ? (
          <div className="flex flex-col items-end gap-1">
            <Link
              to={interviewTarget}
              className={buttonVariants({ size: 'sm', className: 'h-9 shrink-0 gap-1.5' })}
            >
              <Play className="h-4 w-4 fill-current" />
              Vào phỏng vấn
            </Link>
            {inviteExpiresAt && (
              <span className="text-[11px] text-muted-foreground">
                Hạn tham gia:{' '}
                {new Date(inviteExpiresAt).toLocaleString('vi-VN', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            )}
          </div>
        ) : undefined,
      };
    case 'INTERVIEWING':
      return {
        icon: Sparkles,
        text: 'Bạn đang có phiên phỏng vấn chưa hoàn thành.',
        action: interviewTarget ? (
          <Link
            to={interviewTarget}
            className={buttonVariants({ size: 'sm', className: 'h-9 shrink-0 gap-1.5' })}
          >
            <Play className="h-4 w-4 fill-current" />
            Tiếp tục phỏng vấn
          </Link>
        ) : undefined,
      };
    case 'EVALUATED':
      return {
        icon: Hourglass,
        text: 'Đã hoàn thành phỏng vấn. Nhà tuyển dụng đang tổng hợp và đánh giá kết quả.',
      };
    case 'PASSED':
      return {
        icon: CircleCheck,
        text: 'Chúc mừng bạn đã hoàn thành xuất sắc và đạt yêu cầu tuyển dụng.',
        action: (
          <Link
            to={feedbackTarget}
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'h-9 shrink-0 gap-1.5 border-green-200 text-green-800 hover:bg-green-50',
            })}
          >
            <MessageSquareText className="h-4 w-4" />
            Xem phản hồi
          </Link>
        ),
      };
    case 'FAILED':
      return {
        icon: Info,
        text: 'Hồ sơ chưa đạt yêu cầu cho vị trí này. Hãy xem phản hồi chi tiết để chuẩn bị tốt hơn.',
        action: (
          <Link
            to={feedbackTarget}
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'h-9 shrink-0 gap-1.5 border-rose-200 text-rose-800 hover:bg-rose-50',
            })}
          >
            <MessageSquareText className="h-4 w-4" />
            Xem phản hồi
          </Link>
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
          <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
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

function ApplicationSkeletonList() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Đang tải hồ sơ…">
      {[1, 2].map((i) => (
        <Card key={i} className="flex flex-col gap-6 p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-48" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="py-2">
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
        </Card>
      ))}
    </div>
  );
}

export default function CandidateApplicationsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const session = useCurrentUser();
  const query = useMyApplications(session.user?.role === 'CANDIDATE' ? session.user.id : undefined);

  if (session.isLoading) return <p role="status">Đang xác minh tài khoản…</p>;
  if (session.error)
    return <QueryError message="Không tải được tài khoản." retry={() => void session.retry()} />;
  if (!session.user)
    return (
      <Link className="text-primary underline" to={candidateLoginUrl('/candidate/applications')}>
        Đăng nhập để xem hồ sơ
      </Link>
    );
  if (session.user.role !== 'CANDIDATE') return <p>Trang hồ sơ dành cho ứng viên.</p>;

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-page-title text-foreground">Hồ sơ của tôi</h1>
          <p className="mt-1 text-slate-600">
            Theo dõi tiến độ và kết quả đánh giá hồ sơ ứng tuyển
          </p>
        </div>
        {query.data && query.data.length > 0 && (
          <SegmentedControl
            ariaLabel="Lọc hồ sơ"
            className="self-start sm:self-auto"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Tất cả', count: query.data.length },
              {
                value: 'processing',
                label: 'Đang xử lý',
                count: query.data.filter((a) => !isCompleted(a)).length,
              },
              {
                value: 'completed',
                label: 'Đã hoàn thành',
                count: query.data.filter(isCompleted).length,
              },
            ]}
          />
        )}
      </div>

      {query.isPending ? (
        <ApplicationSkeletonList />
      ) : query.isError ? (
        <QueryError message="Không tải được hồ sơ đã nộp." retry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Bạn chưa nộp hồ sơ nào"
          description="Khám phá các vị trí phù hợp và nộp CV để AI hỗ trợ kết nối nhanh chóng."
          action={
            <Link to="/candidate/jobs" className={buttonVariants({ size: 'sm', className: 'h-9' })}>
              <Search />
              Tìm việc
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {(filter === 'all'
            ? query.data
            : filter === 'completed'
              ? query.data.filter(isCompleted)
              : query.data.filter((a) => !isCompleted(a))
          ).map((app) => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}
