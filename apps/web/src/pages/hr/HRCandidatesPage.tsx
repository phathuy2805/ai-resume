import { useMemo } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Filter,
  FolderOpen,
  Loader2,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import EmptyState from '@/components/common/EmptyState';
import {
  AiRecommendationBadge,
  ApplicationStatusBadge,
  JobStatusBadge,
} from '@/components/common/StatusBadges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
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
import { scoreTone } from '@/lib/applicationStatus';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ApplicationStatus } from '@/types/applications';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'SUBMITTED', label: 'Đã nộp' },
  { value: 'SCREENING', label: 'Đang chấm điểm' },
  { value: 'SCREENING_FAILED', label: 'Lỗi chấm điểm' },
  { value: 'SCREENED', label: 'Chờ duyệt' },
  { value: 'SHORTLISTED', label: 'Đạt sàng lọc' },
  { value: 'INTERVIEW_INVITED', label: 'Đã mời PV' },
  { value: 'REJECTED', label: 'Đã loại' },
];

export function HRCandidatesRedirect() {
  const { data, isLoading } = useMyJobs({ limit: 100 });
  const jobs = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={BriefcaseBusiness}
        title="Chưa có tin tuyển dụng nào"
        description="Hãy tạo tin tuyển dụng đầu tiên để quản lý hồ sơ ứng viên."
        action={
          <Link to="/hr/jobs/new" className={buttonVariants()}>
            <Plus className="mr-1.5 h-4 w-4" /> Tạo tin tuyển dụng
          </Link>
        }
      />
    );
  }

  // Ưu tiên chọn job đang mở (OPEN) mới nhất, nếu không có thì lấy job mới nhất bất kỳ
  const openJob = jobs.find((j) => j.status === 'OPEN');
  const targetJob = openJob ?? jobs[0];

  return <Navigate to={`/hr/jobs/${targetJob.id}/candidates`} replace />;
}

export default function HRCandidatesPage() {
  const { jobId = '' } = useParams<{ jobId: string }>();

  // If there is no jobId in params (e.g. visited /hr/candidates), render redirect component
  if (!jobId) {
    return <HRCandidatesRedirect />;
  }

  return <HRCandidatesPageContent jobId={jobId} />;
}

function HRCandidatesPageContent({ jobId }: { jobId: string }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Fetch list of jobs for quick switcher dropdown
  const myJobsQuery = useMyJobs({ limit: 100 });
  const myJobs = myJobsQuery.data?.data ?? [];

  // Fetch current job details (to get cvPassThreshold, title, status)
  const jobDetailQuery = useMyJob(jobId);
  const currentJob = jobDetailQuery.data;
  const cvPassThreshold = currentJob?.cvPassThreshold ?? 70;

  // Read filter params from URL
  const statusParam = searchParams.get('status') ?? 'ALL';
  const minScoreParam = searchParams.get('minScore');
  const maxScoreParam = searchParams.get('maxScore');
  const sortParam = (searchParams.get('sort') as 'score' | 'createdAt') ?? 'createdAt';
  const orderParam = (searchParams.get('order') as 'asc' | 'desc') ?? 'desc';
  const pageParam = parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  // Determine active score preset
  const scorePreset = useMemo(() => {
    if (minScoreParam === String(cvPassThreshold) && !maxScoreParam) return 'PASS';
    if (
      minScoreParam === String(cvPassThreshold - 10) &&
      maxScoreParam === String(cvPassThreshold - 1)
    )
      return 'CONSIDER';
    if (!minScoreParam && maxScoreParam === String(cvPassThreshold - 11)) return 'REJECT';
    if (minScoreParam || maxScoreParam) return 'CUSTOM';
    return 'ALL';
  }, [cvPassThreshold, maxScoreParam, minScoreParam]);

  // Query applications with TanStack Query
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

  // Helper to update search params
  const updateParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === 'ALL') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    setSearchParams(next);
  };

  const handleJobChange = (newJobId: string) => {
    navigate(`/hr/jobs/${newJobId}/candidates`);
  };

  const handleScorePresetChange = (preset: string) => {
    if (preset === 'PASS') {
      updateParams({
        minScore: String(cvPassThreshold),
        maxScore: undefined,
        page: '1',
      });
    } else if (preset === 'CONSIDER') {
      updateParams({
        minScore: String(cvPassThreshold - 10),
        maxScore: String(cvPassThreshold - 1),
        page: '1',
      });
    } else if (preset === 'REJECT') {
      updateParams({
        minScore: undefined,
        maxScore: String(cvPassThreshold - 11),
        page: '1',
      });
    } else {
      updateParams({
        minScore: undefined,
        maxScore: undefined,
        page: '1',
      });
    }
  };

  const handleSortChange = (value: string) => {
    const [sort, order] = value.split('_') as ['score' | 'createdAt', 'asc' | 'desc'];
    updateParams({ sort, order, page: '1' });
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasActiveFilters =
    statusParam !== 'ALL' ||
    Boolean(minScoreParam) ||
    Boolean(maxScoreParam) ||
    sortParam !== 'createdAt' ||
    orderParam !== 'desc';

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header: Job Switcher & Metadata */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Vị trí:</span>
            {myJobsQuery.isLoading ? (
              <Skeleton className="h-10 w-64" />
            ) : (
              <Select value={jobId} onValueChange={handleJobChange}>
                <SelectTrigger className="w-[280px] sm:w-[340px] font-semibold text-foreground">
                  <SelectValue placeholder="Chọn vị trí tuyển dụng..." />
                </SelectTrigger>
                <SelectContent>
                  {myJobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      <span className="flex items-center gap-2">
                        <span className="truncate">{j.title}</span>
                        {j.status === 'CLOSED' && (
                          <span className="text-xs text-muted-foreground">(Đã đóng)</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {currentJob && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <JobStatusBadge status={currentJob.status} />
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                Ngưỡng đạt:{' '}
                <span className="font-medium text-foreground">{cvPassThreshold} điểm</span>
              </span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1">
                <FolderOpen className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">
                  {meta?.total ?? applications.length} hồ sơ
                </span>
              </span>
            </div>
          )}
        </div>

        <div>
          <Link
            to={`/hr/jobs/${jobId}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Xem tin tuyển dụng
          </Link>
        </div>
      </div>

      {/* Filters & Sorting Toolbar */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Lọc:
          </span>

          {/* Status Filter */}
          <Select
            value={statusParam}
            onValueChange={(val) => updateParams({ status: val, page: '1' })}
          >
            <SelectTrigger className="h-9 w-[170px] text-xs">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Score Range Filter */}
          <Select value={scorePreset} onValueChange={handleScorePresetChange}>
            <SelectTrigger className="h-9 w-[190px] text-xs">
              <SelectValue placeholder="Khoảng điểm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Tất cả điểm số
              </SelectItem>
              <SelectItem value="PASS" className="text-xs">
                Đạt ngưỡng (≥ {cvPassThreshold})
              </SelectItem>
              <SelectItem value="CONSIDER" className="text-xs">
                Cân nhắc ({cvPassThreshold - 10} - {cvPassThreshold - 1})
              </SelectItem>
              <SelectItem value="REJECT" className="text-xs">
                Dưới ngưỡng (&lt; {cvPassThreshold - 10})
              </SelectItem>
              {scorePreset === 'CUSTOM' && (
                <SelectItem value="CUSTOM" className="text-xs">
                  Tùy chỉnh ({minScoreParam ?? 0} - {maxScoreParam ?? 100})
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={`${sortParam}_${orderParam}`} onValueChange={handleSortChange}>
            <SelectTrigger className="h-9 w-[175px] text-xs">
              <SelectValue placeholder="Sắp xếp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt_desc" className="text-xs">
                Mới nộp nhất
              </SelectItem>
              <SelectItem value="createdAt_asc" className="text-xs">
                Nộp sớm nhất
              </SelectItem>
              <SelectItem value="score_desc" className="text-xs">
                Điểm cao nhất
              </SelectItem>
              <SelectItem value="score_asc" className="text-xs">
                Điểm thấp nhất
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Applications Table */}
      <Card className="overflow-hidden">
        {applicationsQuery.isLoading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : applicationsQuery.isError ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <h3 className="font-semibold text-foreground">Không thể tải danh sách ứng viên</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Vui lòng thử lại hoặc kiểm tra kết nối mạng.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applicationsQuery.refetch()}
              className="mt-4"
            >
              Thử lại
            </Button>
          </div>
        ) : applications.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Job này chưa có hồ sơ nào"
            description={
              hasActiveFilters
                ? 'Không có ứng viên nào khớp với bộ lọc đang chọn.'
                : 'Ứng viên nộp hồ sơ vào vị trí này sẽ xuất hiện ở đây để AI sàng lọc.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">Ứng viên</TableHead>
                  <TableHead className="w-[140px]">Điểm AI</TableHead>
                  <TableHead className="w-[150px]">Đề xuất AI</TableHead>
                  <TableHead className="w-[140px]">Trạng thái</TableHead>
                  <TableHead className="w-[160px]">Ngày nộp</TableHead>
                  <TableHead className="w-[110px] text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => {
                  const isScoring = app.status === 'SUBMITTED' || app.status === 'SCREENING';
                  const isFailed = app.status === 'SCREENING_FAILED';
                  const tone =
                    app.totalScore !== null ? scoreTone(app.totalScore, cvPassThreshold) : null;

                  return (
                    <TableRow
                      key={app.id}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => navigate(`/hr/applications/${app.id}`)}
                    >
                      {/* Candidate Name & Email */}
                      <TableCell className="py-3.5">
                        <div className="font-semibold text-foreground">{app.candidateName}</div>
                        {app.candidateEmail && (
                          <div className="text-xs text-muted-foreground">{app.candidateEmail}</div>
                        )}
                      </TableCell>

                      {/* AI Score */}
                      <TableCell className="py-3.5">
                        {isScoring ? (
                          <Badge
                            variant="default"
                            className="flex items-center gap-1.5 font-normal"
                          >
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Đang chấm…
                          </Badge>
                        ) : isFailed ? (
                          <Badge variant="danger">Chấm lỗi</Badge>
                        ) : app.totalScore !== null ? (
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold',
                              tone === 'success' && 'bg-green-100 text-green-700',
                              tone === 'warning' && 'bg-amber-100 text-amber-700',
                              tone === 'danger' && 'bg-red-100 text-red-700',
                            )}
                          >
                            {app.totalScore}
                            <span className="font-normal opacity-70">/100</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* AI Recommendation */}
                      <TableCell className="py-3.5">
                        {isScoring || isFailed || !app.aiRecommendation ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <AiRecommendationBadge value={app.aiRecommendation} />
                        )}
                      </TableCell>

                      {/* Application Status */}
                      <TableCell className="py-3.5">
                        <ApplicationStatusBadge status={app.status} />
                      </TableCell>

                      {/* Created At */}
                      <TableCell className="py-3.5 text-xs text-muted-foreground">
                        {formatDateTime(app.createdAt)}
                      </TableCell>

                      {/* Action (Rescreen button if failed) */}
                      <TableCell className="py-3.5 text-right">
                        {isFailed ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={rescreenMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              rescreenMutation.mutate(app.id);
                            }}
                            className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Chấm lại
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground hover:text-foreground">
                            Chi tiết →
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {meta && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
                <span>
                  Trang <strong className="text-foreground">{page}</strong> / {totalPages} (tổng{' '}
                  {meta.total} ứng viên)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => updateParams({ page: String(page - 1) })}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => updateParams({ page: String(page + 1) })}
                    className="h-8 gap-1 text-xs"
                  >
                    Sau
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
