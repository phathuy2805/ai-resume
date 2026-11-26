import {
  CircleCheck,
  CircleX,
  FileText,
  FolderOpen,
  Hourglass,
  Inbox,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import EmptyState from '@/components/common/EmptyState';
import PageHeader from '@/components/common/PageHeader';
import QueryError from '@/components/common/QueryError';
import StatCard from '@/components/common/StatCard';
import { JobStatusBadge } from '@/components/common/StatusBadges';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useJobStats } from '@/hooks/useJobStats';
import { useMyJobs } from '@/hooks/useJobs';
import { AI_RECOMMENDATION, HR_STATUS, type AiRecommendation } from '@/lib/applicationStatus';
import { getErrorMessage } from '@/lib/errorUtils';
import { cn } from '@/lib/utils';
import type { ApplicationStatus, JobStats } from '@/types/applications';
import type { Job } from '@/types/jobs';

/** Statuses HR has let through the CV round (same set the API uses for `hrAgreementRate`). */
const APPROVED_STATUSES: ApplicationStatus[] = [
  'SHORTLISTED',
  'INTERVIEW_INVITED',
  'INTERVIEWING',
  'EVALUATED',
  'PASSED',
  'FAILED',
];

const STATUS_COLOR: Record<ApplicationStatus, string> = {
  SUBMITTED: '#a5b4fc',
  SCREENING: '#fbbf24',
  SCREENING_FAILED: '#f87171',
  SCREENED: '#94a3b8',
  SHORTLISTED: '#22c55e',
  REJECTED: '#ef4444',
  INTERVIEW_INVITED: '#818cf8',
  INTERVIEWING: '#6366f1',
  EVALUATED: '#f59e0b',
  PASSED: '#16a34a',
  FAILED: '#dc2626',
};

const RECOMMENDATION_ORDER: AiRecommendation[] = ['PASS', 'CONSIDER', 'REJECT'];
const recommendationColor: Record<AiRecommendation, { bar: string; text: string }> = {
  PASS: { bar: 'bg-green-500', text: 'text-green-600' },
  CONSIDER: { bar: 'bg-amber-500', text: 'text-amber-600' },
  REJECT: { bar: 'bg-red-500', text: 'text-red-600' },
};

const AXIS_TICK = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };
const GRID_STROKE = 'hsl(var(--border))';

/** Percentage rounded to one decimal; 0 when there is nothing to divide by. */
const percent = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
const formatRate = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 100)}%`);

export default function HRStatsPage() {
  const [searchParams] = useSearchParams();
  const jobsQuery = useMyJobs({ limit: 100 });
  const jobs = jobsQuery.data?.data ?? [];

  if (jobsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton className="h-10 w-72" />
        <StatsSkeleton />
      </div>
    );
  }
  if (jobsQuery.isError) {
    return (
      <QueryError message={getErrorMessage(jobsQuery.error)} retry={() => jobsQuery.refetch()} />
    );
  }
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Chưa có tin tuyển dụng nào"
        description="Hãy tạo tin tuyển dụng để xem thống kê hồ sơ."
      />
    );
  }

  // Missing or unknown ?jobId= falls back to the most recent open job, like the candidates page.
  const requested = searchParams.get('jobId');
  const job =
    jobs.find((item) => item.id === requested) ??
    jobs.find((item) => item.status === 'OPEN') ??
    jobs[0];
  if (job.id !== requested) return <Navigate to={{ search: `?jobId=${job.id}` }} replace />;

  return <HRStatsContent job={job} jobs={jobs} />;
}

function HRStatsContent({ job, jobs }: { job: Job; jobs: Job[] }) {
  const [, setSearchParams] = useSearchParams();
  const statsQuery = useJobStats(job.id);
  const stats = statsQuery.data;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Thống kê"
        description="Tổng quan hồ sơ ứng tuyển theo từng tin tuyển dụng"
        actions={
          <div className="flex flex-col items-end gap-1">
            <Select value={job.id} onValueChange={(value) => setSearchParams({ jobId: value })}>
              <SelectTrigger className="w-full sm:w-80" aria-label="Chọn tin tuyển dụng">
                <SelectValue placeholder="Chọn tin tuyển dụng" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <JobStatusBadge status={job.status} />
              <span>
                Ngưỡng đạt: <strong className="text-foreground">{job.cvPassThreshold} điểm</strong>
              </span>
            </div>
          </div>
        }
      />

      {statsQuery.isLoading ? (
        <StatsSkeleton />
      ) : !stats ? (
        <QueryError
          message={getErrorMessage(statsQuery.error)}
          retry={() => statsQuery.refetch()}
        />
      ) : stats.totalApplications === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Job này chưa có hồ sơ nào"
          description="Số liệu sẽ xuất hiện khi có ứng viên nộp CV."
        />
      ) : (
        // Dim the previous job's numbers while the newly selected job loads.
        <div
          className={cn(
            'flex flex-col gap-8 transition-opacity',
            statsQuery.isPlaceholderData && 'opacity-60',
          )}
        >
          <SummaryCards stats={stats} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <StatusChart stats={stats} />
            <ScoreChart stats={stats} threshold={job.cvPassThreshold} />
          </div>
          <RecommendationBlock stats={stats} />
        </div>
      )}
    </div>
  );
}

function SummaryCards({ stats }: { stats: JobStats }) {
  const total = stats.totalApplications;
  const { byStatus } = stats;
  const screening = byStatus.SUBMITTED + byStatus.SCREENING;
  const approved = APPROVED_STATUSES.reduce((sum, status) => sum + byStatus[status], 0);
  const scored = stats.scoreDistribution.reduce((sum, bucket) => sum + bucket.count, 0);

  const cards: {
    label: string;
    value: string | number;
    icon: LucideIcon;
    iconClassName?: string;
    hint: string;
  }[] = [
    { label: 'Tổng hồ sơ', value: total, icon: FileText, hint: 'hồ sơ đã nộp' },
    {
      label: 'Đang chấm',
      value: screening,
      icon: Hourglass,
      iconClassName: 'text-amber-500',
      hint: `${percent(screening, total)}%`,
    },
    {
      label: 'Đã duyệt',
      value: approved,
      icon: CircleCheck,
      iconClassName: 'text-green-500',
      hint: `${percent(approved, total)}%`,
    },
    {
      label: 'Đã loại',
      value: byStatus.REJECTED,
      icon: CircleX,
      iconClassName: 'text-red-500',
      hint: `${percent(byStatus.REJECTED, total)}%`,
    },
    {
      label: 'AI đề xuất đạt',
      value: formatRate(scored > 0 ? stats.aiPassRate : null),
      icon: Sparkles,
      iconClassName: 'text-primary',
      hint: `trên ${scored} hồ sơ đã chấm`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          iconClassName={card.iconClassName}
          hint={<span className="text-xs text-muted-foreground">{card.hint}</span>}
        />
      ))}
    </div>
  );
}

function StatusChart({ stats }: { stats: JobStats }) {
  // Keep the lifecycle order from HR_STATUS and drop empty statuses so the chart stays readable.
  const data = (Object.keys(HR_STATUS) as ApplicationStatus[])
    .map((status) => ({ status, label: HR_STATUS[status].label, count: stats.byStatus[status] }))
    .filter((item) => item.count > 0);

  return (
    <Card className="p-6">
      <h2 className="text-card-title text-foreground">Hồ sơ theo trạng thái</h2>
      <p className="text-xs text-muted-foreground">Số lượng ứng viên ở từng giai đoạn</p>
      <div className="mt-5" style={{ height: Math.max(data.length * 40, 120) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
          >
            <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
            <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              formatter={(value) => [`${value} hồ sơ`, 'Số lượng']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {data.map((item) => (
                <Cell key={item.status} fill={STATUS_COLOR[item.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ScoreChart({ stats, threshold }: { stats: JobStats; threshold: number }) {
  // Plot buckets on a numeric 0–100 axis (bar at the bucket centre) so the threshold line
  // sits at its exact score instead of snapping to a bucket.
  const data = stats.scoreDistribution.map((bucket) => {
    const [min = 0, max = min + 9] = bucket.range.split('-').map(Number);
    return { ...bucket, min, mid: min + 5, label: `${min}–${max}` };
  });

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-card-title text-foreground">Phân bố điểm CV</h2>
          <p className="text-xs text-muted-foreground">Số hồ sơ theo khoảng điểm AI (0–100)</p>
        </div>
        <Badge variant="danger">Ngưỡng đạt ≥ {threshold}</Badge>
      </div>
      <div className="mt-5 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis
              type="number"
              dataKey="mid"
              domain={[0, 100]}
              ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
              tick={AXIS_TICK}
            />
            <YAxis allowDecimals={false} tick={AXIS_TICK} />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              labelFormatter={(_, payload) => `Khoảng ${payload?.[0]?.payload?.label ?? ''} điểm`}
              formatter={(value) => [`${value} hồ sơ`, 'Số lượng']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((bucket) => (
                <Cell
                  key={bucket.range}
                  fill={bucket.min >= threshold ? 'hsl(var(--primary))' : '#c7d2fe'}
                />
              ))}
            </Bar>
            <ReferenceLine
              x={threshold}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{
                value: `Ngưỡng ${threshold}`,
                position: 'top',
                fill: '#dc2626',
                fontSize: 11,
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function RecommendationBlock({ stats }: { stats: JobStats }) {
  const { byRecommendation } = stats;
  const rated = RECOMMENDATION_ORDER.reduce((sum, key) => sum + byRecommendation[key], 0);

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <h2 className="text-card-title text-foreground">AI đề xuất</h2>
          <p className="text-xs text-muted-foreground">Tỷ lệ hồ sơ theo đánh giá sơ bộ của AI</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Đã đánh giá: {rated} hồ sơ</span>
          {byRecommendation.unrated > 0 && (
            <span>Chưa đánh giá: {byRecommendation.unrated} hồ sơ</span>
          )}
          <span>
            HR đồng ý với AI:{' '}
            <strong className="text-foreground">{formatRate(stats.hrAgreementRate)}</strong>
          </span>
        </div>
      </div>

      {rated === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có hồ sơ nào được AI đánh giá.</p>
      ) : (
        <>
          <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100 p-0.5">
            {RECOMMENDATION_ORDER.filter((key) => byRecommendation[key] > 0).map((key) => (
              <div
                key={key}
                title={AI_RECOMMENDATION[key].label}
                className={`h-full first:rounded-l-full last:rounded-r-full ${recommendationColor[key].bar}`}
                style={{ width: `${percent(byRecommendation[key], rated)}%` }}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {RECOMMENDATION_ORDER.map((key) => (
              <div
                key={key}
                data-testid={`recommendation-${key}`}
                className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3"
              >
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${recommendationColor[key].bar}`}
                />
                <div className="flex flex-1 flex-col">
                  <span className="text-xs font-medium text-muted-foreground">
                    {AI_RECOMMENDATION[key].label}
                  </span>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="font-semibold text-foreground">{byRecommendation[key]}</span>
                    <span className="text-xs text-muted-foreground">hồ sơ</span>
                    <span
                      className={`ml-auto text-xs font-medium ${recommendationColor[key].text}`}
                    >
                      {Math.round(percent(byRecommendation[key], rated))}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-label="Đang tải thống kê">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((item) => (
          <Skeleton key={item} className="h-[104px] w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[340px] w-full" />
        <Skeleton className="h-[340px] w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
