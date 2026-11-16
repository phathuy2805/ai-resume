import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownWideNarrow,
  Check,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Lock,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import SearchInput from '@/components/common/SearchInput';
import SegmentedControl from '@/components/common/SegmentedControl';
import ScoreBar from '@/components/common/ScoreBar';
import {
  AiRecommendationBadge,
  ApplicationStatusBadge,
  JobStatusBadge,
} from '@/components/common/StatusBadges';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { formatDate, initials } from '@/lib/format';
import { mockCandidates, mockJobs, type CandidateRow } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import type { ApplicationStatus } from '@/types/applications';

type TabKey = 'all' | 'review' | 'shortlisted' | 'interview' | 'rejected';
type SortKey = 'score' | 'newest';

const TAB_STATUSES: Record<Exclude<TabKey, 'all'>, ApplicationStatus[]> = {
  review: ['SCREENED'],
  shortlisted: ['SHORTLISTED'],
  interview: ['INTERVIEW_INVITED', 'INTERVIEWING', 'EVALUATED', 'PASSED', 'FAILED'],
  rejected: ['REJECTED'],
};

const SORT_LABEL: Record<SortKey, string> = { score: 'Điểm cao nhất', newest: 'Mới nhất' };

function matchesTab(candidate: CandidateRow, tab: TabKey) {
  return tab === 'all' || TAB_STATUSES[tab].includes(candidate.status);
}

export default function HRCandidatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const job = mockJobs.find((item) => item.id === searchParams.get('jobId')) ?? mockJobs[0];
  const [tab, setTab] = useState<TabKey>('all');
  const [sort, setSort] = useState<SortKey>('score');
  const [search, setSearch] = useState('');

  // TODO(W2-FE-01): load candidates of `job` from the HR dashboard API.
  const jobCandidates = useMemo(
    () => mockCandidates.filter((candidate) => candidate.jobId === job.id),
    [job.id],
  );

  // Rank = position by score among already-scored candidates.
  const ranks = useMemo(() => {
    const scored = jobCandidates
      .filter((candidate) => candidate.score !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return new Map(scored.map((candidate, index) => [candidate.id, index + 1]));
  }, [jobCandidates]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobCandidates
      .filter(
        (candidate) =>
          matchesTab(candidate, tab) &&
          (!query ||
            candidate.fullName.toLowerCase().includes(query) ||
            candidate.email.toLowerCase().includes(query)),
      )
      .sort((a, b) =>
        sort === 'score'
          ? (b.score ?? -1) - (a.score ?? -1)
          : b.createdAt.localeCompare(a.createdAt),
      );
  }, [jobCandidates, search, sort, tab]);

  const count = (key: TabKey) => jobCandidates.filter((c) => matchesTab(c, key)).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger className="group flex items-center gap-2 text-left">
            <span className="text-page-title text-foreground">{job.title}</span>
            <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel>Chọn vị trí</DropdownMenuLabel>
            {mockJobs.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className={cn(item.id === job.id && 'bg-slate-50 font-medium')}
                onClick={() => {
                  setSearchParams({ jobId: item.id });
                  setTab('all');
                }}
              >
                <span className="flex-1 truncate">{item.title}</span>
                {item.id === job.id && <Check className="!text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <JobStatusBadge status={job.status} />
          <span className="inline-flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            Ngưỡng đạt:{' '}
            <span className="font-medium text-foreground">{job.cvPassThreshold} điểm</span>
          </span>
          <span className="text-slate-300">·</span>
          <span className="inline-flex items-center gap-1">
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{jobCandidates.length} hồ sơ</span>
          </span>
        </div>
      </div>

      <SegmentedControl
        ariaLabel="Lọc theo trạng thái hồ sơ"
        className="w-full justify-start overflow-x-auto bg-card p-1 ring-1 ring-border [&>button]:flex-none [&>button]:px-4 [&>button]:text-sm"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: 'Tất cả', count: count('all') },
          { value: 'review', label: 'Chờ duyệt', count: count('review') },
          { value: 'shortlisted', label: 'Đạt sàng lọc', count: count('shortlisted') },
          { value: 'interview', label: 'Phỏng vấn', count: count('interview') },
          { value: 'rejected', label: 'Đã loại', count: count('rejected') },
        ]}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          className="sm:w-80"
          placeholder="Tìm ứng viên theo tên hoặc email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-[38px] items-center gap-2 rounded-lg border border-border bg-card px-3 transition-colors hover:bg-slate-50">
            <ArrowDownWideNarrow className="h-4 w-4 text-muted-foreground" />
            Sắp xếp: <strong className="font-semibold">{SORT_LABEL[sort]}</strong>
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

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              <TableHead className="w-14 text-center">#</TableHead>
              <TableHead className="min-w-[240px]">Ứng viên</TableHead>
              <TableHead className="min-w-[150px]">Điểm CV</TableHead>
              <TableHead className="min-w-[140px]">AI đề xuất</TableHead>
              <TableHead className="min-w-[140px]">Trạng thái</TableHead>
              <TableHead>Ngày nộp</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((candidate) => {
              const rank = ranks.get(candidate.id);
              const scoring = candidate.status === 'SCREENING';
              const failed = candidate.status === 'SCREENING_FAILED';
              return (
                <TableRow
                  key={candidate.id}
                  className={cn(
                    'group',
                    scoring && 'bg-slate-50/60',
                    failed && 'hover:bg-red-50/40',
                  )}
                >
                  <TableCell className="text-center">
                    {rank ? (
                      <span
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                          rank === 1 ? 'bg-indigo-50 text-primary' : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {rank}
                      </span>
                    ) : (
                      <span
                        className={cn('font-semibold', failed ? 'text-red-600' : 'text-slate-400')}
                      >
                        {failed ? '!' : '—'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                          failed ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-700',
                        )}
                      >
                        {initials(candidate.fullName)}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
                          {candidate.fullName}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {candidate.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {candidate.score !== null ? (
                      <ScoreBar score={candidate.score} threshold={job.cvPassThreshold} />
                    ) : scoring ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium italic text-primary">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Đang chấm điểm...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        Không đọc được CV
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {candidate.aiRecommendation ? (
                      <AiRecommendationBadge value={candidate.aiRecommendation} />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ApplicationStatusBadge status={candidate.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(candidate.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      {failed && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-primary"
                          onClick={() =>
                            toast.success(`Đã gửi chấm lại hồ sơ ${candidate.fullName}`)
                          }
                        >
                          <RefreshCw />
                          Chấm lại
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={scoring}
                        // TODO(W2-FE-02): navigate to the candidate detail page.
                        onClick={() => toast.info('Màn hình chi tiết ứng viên sẽ có ở W2-FE-02')}
                      >
                        Xem
                        {scoring ? <Lock /> : <ChevronRight />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Chưa có ứng viên nào trong mục này.
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
        <div className="border-t border-border bg-slate-50/60 px-4 py-3 text-xs text-muted-foreground">
          Hiển thị <strong className="font-medium text-foreground">{rows.length}</strong> trong tổng
          số <strong className="font-medium text-foreground">{jobCandidates.length}</strong> ứng
          viên
        </div>
      </Card>
    </div>
  );
}
