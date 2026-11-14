import { useMemo, useState } from 'react';
import {
  Ban,
  BriefcaseBusiness,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import PageHeader from '@/components/common/PageHeader';
import SearchInput from '@/components/common/SearchInput';
import SegmentedControl from '@/components/common/SegmentedControl';
import SkillChip from '@/components/common/SkillChip';
import StatCard from '@/components/common/StatCard';
import { JobStatusBadge } from '@/components/common/StatusBadges';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { mockCandidates, mockJobStats, mockJobs } from '@/lib/mockData';
import type { Job } from '@/types/jobs';

type StatusFilter = 'all' | 'OPEN' | 'CLOSED';

const createJobLink = (
  <Link to="/hr/jobs/new" className={buttonVariants()}>
    <Plus />
    Tạo tin mới
  </Link>
);

export default function HRJobsPage() {
  const navigate = useNavigate();
  // TODO(W1-FE-04): replace with getMyJobs() via TanStack Query.
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const visibleJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter(
      (job) =>
        (status === 'all' || job.status === status) &&
        (!query || job.title.toLowerCase().includes(query)),
    );
  }, [jobs, search, status]);

  const openCount = jobs.filter((job) => job.status === 'OPEN').length;
  const totalApplications = jobs.reduce(
    (sum, job) => sum + (mockJobStats[job.id]?.applications ?? 0),
    0,
  );
  const awaitingReview = mockCandidates.filter((c) => c.status === 'SCREENED').length;

  const toggleStatus = (job: Job) => {
    const next = job.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    setJobs((current) => current.map((j) => (j.id === job.id ? { ...j, status: next } : j)));
    toast.success(next === 'CLOSED' ? `Đã đóng tin "${job.title}"` : `Đã mở lại "${job.title}"`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tin tuyển dụng"
        description="Quản lý các vị trí đang tuyển"
        actions={jobs.length > 0 && createJobLink}
      />

      {jobs.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="Chưa có tin tuyển dụng nào"
          description="Tạo tin đầu tiên để AI bắt đầu sàng lọc hồ sơ ứng viên cho bạn."
          action={
            <Link to="/hr/jobs/new" className={buttonVariants()}>
              <Plus />
              Tạo tin đầu tiên
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Tin đang mở" value={openCount} />
            <StatCard label="Tổng hồ sơ" value={totalApplications} />
            <StatCard label="Chờ HR duyệt" value={awaitingReview} />
          </div>

          <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <SearchInput
              className="sm:w-80"
              placeholder="Tìm theo tên vị trí"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <SegmentedControl
              ariaLabel="Lọc theo trạng thái"
              className="self-start sm:self-auto"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'OPEN', label: 'Đang mở' },
                { value: 'CLOSED', label: 'Đã đóng' },
              ]}
            />
          </Card>

          <Card>
            {/* Visible overflow on wide screens so the row menu is not clipped. */}
            <Table containerClassName="xl:overflow-visible">
              <TableHeader>
                <tr>
                  <TableHead className="w-[40%] pl-5">Vị trí</TableHead>
                  <TableHead className="text-right">Hồ sơ</TableHead>
                  <TableHead className="text-right">Đạt sàng lọc</TableHead>
                  <TableHead className="text-center">Ngưỡng điểm</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="w-16 text-right">Thao tác</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {visibleJobs.map((job) => {
                  const stats = mockJobStats[job.id] ?? { applications: 0, shortlisted: 0 };
                  return (
                    <TableRow key={job.id}>
                      <TableCell className="py-4 pl-5">
                        <Link
                          to={`/hr/candidates?jobId=${job.id}`}
                          className="font-semibold text-foreground transition-colors hover:text-primary"
                        >
                          {job.title}
                        </Link>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {job.requiredSkills.slice(0, 3).map((skill) => (
                            <SkillChip key={skill}>{skill}</SkillChip>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{stats.applications}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {stats.shortlisted}
                      </TableCell>
                      <TableCell className="text-center">{job.cvPassThreshold}</TableCell>
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
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground"
                          >
                            <MoreHorizontal className="h-[18px] w-[18px]" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => navigate(`/hr/jobs/${job.id}/edit`)}>
                              <Pencil />
                              Sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/hr/candidates?jobId=${job.id}`)}
                            >
                              <Users />
                              Xem ứng viên
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {job.status === 'OPEN' ? (
                              <DropdownMenuItem
                                className="text-red-600 hover:bg-red-50 [&_svg]:text-red-600"
                                onClick={() => toggleStatus(job)}
                              >
                                <Ban />
                                Đóng tin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => toggleStatus(job)}>
                                <RotateCcw />
                                Mở lại tin
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {visibleJobs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                      Không có tin tuyển dụng nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
            <div className="border-t border-border px-5 py-3 text-muted-foreground">
              Hiển thị {visibleJobs.length} trên tổng số {jobs.length} tin
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
