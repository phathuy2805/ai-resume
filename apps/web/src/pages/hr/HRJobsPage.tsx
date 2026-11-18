import { useState } from 'react';
import { Ban, BriefcaseBusiness, MoreHorizontal, Pencil, Plus, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import PageHeader from '@/components/common/PageHeader';
import SearchInput from '@/components/common/SearchInput';
import SegmentedControl from '@/components/common/SegmentedControl';
import SkillChip from '@/components/common/SkillChip';
import { JobStatusBadge } from '@/components/common/StatusBadges';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCloseJob, useMyJobs } from '@/hooks/useJobs';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Job, JobStatus } from '@/types/jobs';

type StatusFilter = 'all' | JobStatus;

const PAGE_SIZE = 10;

export default function HRJobsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [closingJob, setClosingJob] = useState<Job | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const jobsQuery = useMyJobs({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
  });
  const closeJob = useCloseJob();

  const jobs = jobsQuery.data?.data ?? [];
  const meta = jobsQuery.data?.meta;
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;
  // Filters active → keep the toolbar so the HR can clear them instead of seeing the empty state.
  const hasFilters = search.trim() !== '' || status !== 'all';

  const createLink = (
    <Link to="/hr/jobs/new" className={buttonVariants()}>
      <Plus /> Tạo tin mới
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tin tuyển dụng"
        description="Quản lý các vị trí đang tuyển"
        actions={createLink}
      />
      {jobsQuery.isLoading ? (
        <Card className="space-y-3 p-5">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-16 w-full" />
          ))}
        </Card>
      ) : jobsQuery.isError ? (
        <Card className="p-8 text-center text-sm text-destructive">
          Không thể tải danh sách tin tuyển dụng.
        </Card>
      ) : jobs.length === 0 && !hasFilters ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="Chưa có tin tuyển dụng nào"
          description="Tạo tin đầu tiên để AI bắt đầu sàng lọc hồ sơ ứng viên cho bạn."
          action={createLink}
        />
      ) : (
        <>
          <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <SearchInput
              className="sm:w-80"
              placeholder="Tìm theo tên vị trí"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <SegmentedControl
              ariaLabel="Lọc theo trạng thái"
              className="self-start sm:self-auto"
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'OPEN', label: 'Đang mở' },
                { value: 'CLOSED', label: 'Đã đóng' },
              ]}
            />
          </Card>
          <Card
            aria-busy={jobsQuery.isPlaceholderData}
            className={cn('transition-opacity', jobsQuery.isPlaceholderData && 'opacity-60')}
          >
            <Table>
              <TableHeader>
                <tr>
                  <TableHead className="w-[42%] pl-5">Vị trí</TableHead>
                  <TableHead className="text-right">Hồ sơ</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="w-16 text-right">Thao tác</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="py-4 pl-5">
                      <Link
                        to={`/hr/candidates?jobId=${job.id}`}
                        className="font-semibold text-foreground hover:text-primary"
                      >
                        {job.title}
                      </Link>
                      {job.level && (
                        <div className="mt-1 text-xs text-muted-foreground">{job.level}</div>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {job.requiredSkills.slice(0, 3).map((skill) => (
                          <SkillChip key={skill}>{skill}</SkillChip>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{job.applicationCount ?? 0}</TableCell>
                    <TableCell className="text-center">
                      <JobStatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(job.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label="Thao tác"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-slate-100"
                        >
                          <MoreHorizontal className="h-[18px] w-[18px]" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {job.status === 'OPEN' && (
                            <DropdownMenuItem onClick={() => navigate(`/hr/jobs/${job.id}/edit`)}>
                              <Pencil />
                              Sửa
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => navigate(`/hr/candidates?jobId=${job.id}`)}
                          >
                            <Users />
                            Xem ứng viên
                          </DropdownMenuItem>
                          {job.status === 'OPEN' && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setClosingJob(job)}
                            >
                              <Ban />
                              Đóng tin
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                      Không có tin tuyển dụng nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
            {meta && meta.total > 0 && (
              <div className="flex items-center justify-between border-t px-5 py-3 text-sm text-muted-foreground">
                <span>
                  Trang {meta.page} / {totalPages} · {meta.total} tin
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md border px-3 py-1.5 disabled:opacity-40"
                    disabled={meta.page <= 1 || jobsQuery.isPlaceholderData}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    className="rounded-md border px-3 py-1.5 disabled:opacity-40"
                    disabled={meta.page >= totalPages || jobsQuery.isPlaceholderData}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
      <AlertDialog
        open={!!closingJob}
        onOpenChange={(open) => {
          if (!open) setClosingJob(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đóng tin tuyển dụng?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn đóng tin tuyển dụng này?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="inline-flex h-10 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-medium text-white"
              onClick={() => {
                if (!closingJob) return;
                closeJob.mutate(closingJob.id, {
                  onSuccess: () => toast.success(`Đã đóng tin "${closingJob.title}"`),
                  onError: () => undefined,
                });
                setClosingJob(null);
              }}
            >
              Đóng tin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
