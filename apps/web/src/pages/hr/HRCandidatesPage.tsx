import { AlertCircle, FolderOpen, Loader2, RotateCcw } from 'lucide-react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import EmptyState from '@/components/common/EmptyState';
import PageHeader from '@/components/common/PageHeader';
import {
  AiRecommendationBadge,
  ApplicationStatusBadge,
  JobStatusBadge,
} from '@/components/common/StatusBadges';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useJobApplications, useRescreenApplication } from '@/hooks/useJobApplications';
import { useMyJob, useMyJobs } from '@/hooks/useJobs';
import { HR_STATUS, scoreTone } from '@/lib/applicationStatus';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ApplicationStatus } from '@/types/applications';

function HRCandidatesRedirect() {
  const jobsQuery = useMyJobs({ limit: 100 });
  const jobs = jobsQuery.data?.data ?? [];
  if (jobsQuery.isLoading) return <Skeleton className="h-32 w-full" />;
  if (jobsQuery.isError || jobs.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Chưa có tin tuyển dụng nào"
        description="Hãy tạo tin tuyển dụng để bắt đầu quản lý ứng viên."
      />
    );
  }
  const target = jobs.find((job) => job.status === 'OPEN') ?? jobs[0];
  return <Navigate to={`/hr/jobs/${target.id}/candidates`} replace />;
}

export default function HRCandidatesPage() {
  const { jobId = '' } = useParams<{ jobId: string }>();
  if (!jobId) return <HRCandidatesRedirect />;
  return <HRCandidatesPageContent jobId={jobId} />;
}

function HRCandidatesPageContent({ jobId }: { jobId: string }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const myJobsQuery = useMyJobs({ limit: 100 });
  const jobQuery = useMyJob(jobId);
  const myJobs = myJobsQuery.data?.data ?? [];
  const job = jobQuery.data;
  const threshold = job?.cvPassThreshold ?? 70;

  const statusParam = searchParams.get('status') ?? 'ALL';
  const minScoreParam = searchParams.get('minScore');
  const maxScoreParam = searchParams.get('maxScore');
  const sortParam = (searchParams.get('sort') as 'score' | 'createdAt') ?? 'createdAt';
  const orderParam = (searchParams.get('order') as 'asc' | 'desc') ?? 'desc';
  const pageParam = parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const applicationsQuery = useJobApplications(jobId, {
    status: statusParam === 'ALL' ? undefined : (statusParam as ApplicationStatus),
    minScore: minScoreParam ? parseInt(minScoreParam, 10) : undefined,
    maxScore: maxScoreParam ? parseInt(maxScoreParam, 10) : undefined,
    sort: sortParam,
    order: orderParam,
    page,
    limit: 10,
  });
  const rescreenMutation = useRescreenApplication(jobId);

  const applications = applicationsQuery.data?.data ?? [];
  const meta = applicationsQuery.data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === 'ALL') next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next);
  };

  if (jobQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (jobQuery.isError || !job) {
    return (
      <Card className="flex flex-col items-center p-10 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
        <h2 className="font-semibold">Không thể tải tin tuyển dụng</h2>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        back={{ to: `/hr/jobs/${jobId}`, label: 'Chi tiết tin tuyển dụng' }}
        title="Danh sách ứng viên"
      />

      <Card className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1">
          <Select value={jobId} onValueChange={(value) => navigate(`/hr/jobs/${value}/candidates`)}>
            <SelectTrigger className="w-full lg:w-80">
              <SelectValue placeholder="Chọn tin tuyển dụng" />
            </SelectTrigger>
            <SelectContent>
              {myJobs.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <JobStatusBadge status={job.status} />
            <span>
              Ngưỡng đạt: <strong className="text-foreground">{threshold} điểm</strong>
            </span>
            <span>· {meta?.total ?? 0} hồ sơ</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select
            value={statusParam}
            onValueChange={(value) => updateParams({ status: value, page: '1' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              {(Object.keys(HR_STATUS) as ApplicationStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {HR_STATUS[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={
              minScoreParam || maxScoreParam
                ? `${minScoreParam ?? ''}:${maxScoreParam ?? ''}`
                : 'ALL'
            }
            onValueChange={(value) => {
              if (value === 'ALL')
                updateParams({ minScore: undefined, maxScore: undefined, page: '1' });
              if (value === 'PASS')
                updateParams({ minScore: String(threshold), maxScore: undefined, page: '1' });
              if (value === 'CONSIDER')
                updateParams({
                  minScore: String(threshold - 10),
                  maxScore: String(threshold - 1),
                  page: '1',
                });
              if (value === 'REJECT')
                updateParams({ minScore: undefined, maxScore: String(threshold - 11), page: '1' });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả điểm</SelectItem>
              <SelectItem value="PASS">Đạt ngưỡng ({threshold}+)</SelectItem>
              <SelectItem value="CONSIDER">
                Cân nhắc ({threshold - 10}–{threshold - 1})
              </SelectItem>
              <SelectItem value="REJECT">Dưới ngưỡng ({threshold - 10})</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={`${sortParam}_${orderParam}`}
            onValueChange={(value) => {
              const [sort, order] = value.split('_') as ['score' | 'createdAt', 'asc' | 'desc'];
              updateParams({ sort, order, page: '1' });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt_desc">Mới nộp nhất</SelectItem>
              <SelectItem value="createdAt_asc">Nộp lâu nhất</SelectItem>
              <SelectItem value="score_desc">Điểm cao nhất</SelectItem>
              <SelectItem value="score_asc">Điểm thấp nhất</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {applicationsQuery.isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} className="h-14 w-full" />
            ))}
          </div>
        ) : applicationsQuery.isError ? (
          <div className="flex flex-col items-center p-10 text-center">
            <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
            <h3 className="font-semibold">Không thể tải danh sách ứng viên</h3>
            <Button
              className="mt-4"
              variant="outline"
              size="sm"
              onClick={() => applicationsQuery.refetch()}
            >
              Thử lại
            </Button>
          </div>
        ) : applications.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Job này chưa có hồ sơ nào"
            description="Ứng viên nộp hồ sơ vào vị trí này sẽ xuất hiện ở đây để AI sàng lọc."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ứng viên</TableHead>
                <TableHead>Điểm AI</TableHead>
                <TableHead>Đề xuất AI</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày nộp</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => {
                const isScoring = app.status === 'SUBMITTED' || app.status === 'SCREENING';
                const isFailed = app.status === 'SCREENING_FAILED';
                const tone = app.totalScore !== null ? scoreTone(app.totalScore, threshold) : null;
                return (
                  <TableRow
                    key={app.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/hr/applications/${app.id}`)}
                  >
                    <TableCell>
                      <div className="font-semibold">{app.candidateName}</div>
                      {app.candidateEmail && (
                        <div className="text-xs text-muted-foreground">{app.candidateEmail}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isScoring ? (
                        <span className="flex items-center gap-1.5 text-xs text-primary">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Đang chấm…
                        </span>
                      ) : isFailed ? (
                        <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          Chấm lỗi
                        </span>
                      ) : app.totalScore !== null ? (
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-xs font-bold',
                            tone === 'success' && 'bg-green-100 text-green-700',
                            tone === 'warning' && 'bg-amber-100 text-amber-700',
                            tone === 'danger' && 'bg-red-100 text-red-700',
                          )}
                        >
                          {app.totalScore}/100
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {app.aiRecommendation && !isScoring && !isFailed ? (
                        <AiRecommendationBadge value={app.aiRecommendation} />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <ApplicationStatusBadge status={app.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(app.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isFailed ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-destructive"
                          disabled={rescreenMutation.isPending}
                          onClick={(event) => {
                            event.stopPropagation();
                            rescreenMutation.mutate(app.id);
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Chấm lại
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Chi tiết →</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {meta && meta.total > 0 && (
          <div className="flex items-center justify-between border-t px-5 py-3 text-sm text-muted-foreground">
            <span>
              Trang {meta.page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
