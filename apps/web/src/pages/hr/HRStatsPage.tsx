import { useState } from 'react';
import { BadgeCheck, Check, ChevronDown, FileText, Filter, Users, CircleCheck } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AI_RECOMMENDATION } from '@/lib/applicationStatus';
import { mockJobs, mockStats } from '@/lib/mockData';

const percent = (part: number, total: number) => Math.round((part / total) * 1000) / 10;

const recommendationColor = {
  PASS: { bar: 'bg-green-500', text: 'text-green-600' },
  CONSIDER: { bar: 'bg-amber-500', text: 'text-amber-600' },
  REJECT: { bar: 'bg-red-500', text: 'text-red-600' },
};

export default function HRStatsPage() {
  const [jobId, setJobId] = useState<string>('all');
  // TODO(W2-FE-04): fetch aggregates for `jobId` from the dashboard stats API.
  const stats = mockStats;
  const jobLabel =
    jobId === 'all' ? 'Tất cả tin tuyển dụng' : mockJobs.find((job) => job.id === jobId)?.title;
  const maxBucket = Math.max(...stats.scoreBuckets.map((bucket) => bucket.value));
  const recommendationTotal = Object.values(stats.recommendations).reduce((a, b) => a + b, 0);
  const threshold = 70;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Thống kê"
        description="Dữ liệu tổng hợp từ các tin tuyển dụng"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 font-medium transition-colors hover:bg-slate-50">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {jobLabel}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              {[{ id: 'all', title: 'Tất cả tin tuyển dụng' }, ...mockJobs].map((job) => (
                <DropdownMenuItem key={job.id} onClick={() => setJobId(job.id)}>
                  <span className="flex-1 truncate">{job.title}</span>
                  {job.id === jobId && <Check className="!text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng hồ sơ" value={stats.total} icon={FileText} />
        <StatCard
          label="Đạt sàng lọc"
          value={stats.shortlisted}
          icon={CircleCheck}
          iconClassName="text-green-500"
          hint={<Badge variant="success">{percent(stats.shortlisted, stats.total)}%</Badge>}
        />
        <StatCard
          label="Đã phỏng vấn"
          value={stats.interviewed}
          icon={Users}
          iconClassName="text-primary"
          hint={
            <span className="text-xs text-muted-foreground">
              {percent(stats.interviewed, stats.total)}% tổng hồ sơ
            </span>
          }
        />
        <StatCard
          label="Đạt cuối cùng"
          value={stats.passed}
          icon={BadgeCheck}
          iconClassName="text-primary"
          hint={<Badge>{percent(stats.passed, stats.total)}% tổng</Badge>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-card-title text-foreground">Hồ sơ theo trạng thái</h2>
          <p className="text-xs text-muted-foreground">Số lượng ứng viên ở từng giai đoạn</p>
          <div className="mt-5 flex flex-col gap-3.5">
            {stats.byStatus.map((item) => (
              <div key={item.label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-foreground">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${item.color}`} />
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${percent(item.value, stats.total)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-card-title text-foreground">Phân bố điểm CV</h2>
              <p className="text-xs text-muted-foreground">Số hồ sơ theo khoảng điểm AI (0–100)</p>
            </div>
            <Badge variant="danger">Ngưỡng đạt ≥ {threshold}</Badge>
          </div>
          <div className="relative mt-6 h-[240px]">
            {/* Threshold marker placed proportionally on the 0-100 axis. */}
            <div
              className="pointer-events-none absolute bottom-7 top-0 z-20 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${threshold}%` }}
            >
              <span className="mb-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Ngưỡng {threshold}
              </span>
              <div className="flex-1 border-r border-dashed border-red-500" />
            </div>
            <div className="relative z-10 flex h-[calc(100%-28px)] items-end gap-3 px-2">
              {stats.scoreBuckets.map((bucket) => {
                const peak = bucket.value === maxBucket;
                return (
                  <div
                    key={bucket.label}
                    className="flex h-full flex-1 flex-col items-center justify-end"
                  >
                    <span
                      className={`mb-1 text-xs font-medium ${peak ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
                    >
                      {bucket.value}
                    </span>
                    <div
                      className={`w-full max-w-14 rounded-t ${peak ? 'bg-primary' : 'bg-indigo-300'}`}
                      style={{ height: `${(bucket.value / maxBucket) * 85}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 border-t border-border px-2 pt-2">
              {stats.scoreBuckets.map((bucket) => (
                <div
                  key={bucket.label}
                  className="flex-1 text-center text-xs text-muted-foreground"
                >
                  {bucket.label}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
          <div>
            <h2 className="text-card-title text-foreground">AI đề xuất</h2>
            <p className="text-xs text-muted-foreground">Tỷ lệ hồ sơ theo đánh giá sơ bộ của AI</p>
          </div>
          <span className="text-xs text-muted-foreground">
            Tổng số đánh giá: {recommendationTotal} hồ sơ
          </span>
        </div>
        <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100 p-0.5">
          {(Object.keys(stats.recommendations) as (keyof typeof stats.recommendations)[]).map(
            (key) => (
              <div
                key={key}
                title={AI_RECOMMENDATION[key].label}
                className={`h-full first:rounded-l-full last:rounded-r-full ${recommendationColor[key].bar}`}
                style={{ width: `${percent(stats.recommendations[key], recommendationTotal)}%` }}
              />
            ),
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(Object.keys(stats.recommendations) as (keyof typeof stats.recommendations)[]).map(
            (key) => (
              <div key={key} className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3">
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${recommendationColor[key].bar}`}
                />
                <div className="flex flex-1 flex-col">
                  <span className="text-xs font-medium text-muted-foreground">
                    {AI_RECOMMENDATION[key].label}
                  </span>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="font-semibold text-foreground">
                      {stats.recommendations[key]}
                    </span>
                    <span className="text-xs text-muted-foreground">hồ sơ</span>
                    <span
                      className={`ml-auto text-xs font-medium ${recommendationColor[key].text}`}
                    >
                      {Math.round(percent(stats.recommendations[key], recommendationTotal))}%
                    </span>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </Card>
    </div>
  );
}
