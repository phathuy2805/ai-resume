import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const jobs = [
  [
    'Lead AI Scientist / LLM Architect',
    'AI Labs & R&D',
    '142 CV',
    '38 AI Match ≥90%',
    'Đang mở',
    'L4 · High Priority',
  ],
  [
    'Senior Fullstack Engineer (React / Go)',
    'Engineering',
    '285 CV',
    '64 AI Match ≥90%',
    'Đang mở',
    'L4 · Core Infra',
  ],
  [
    'Staff Product Designer (Design Systems)',
    'Product & UX',
    '88 CV',
    '19 AI Match ≥90%',
    'Đang mở',
    'L5 · Crucial',
  ],
  [
    'DevOps / Cloud Platform (AWS/K8s)',
    'Infrastructure',
    '45 CV',
    '42 AI Match ≥90%',
    'Đang mở',
    'L5 · Infra',
  ],
  ['Lead Recruiter', 'Talent & People', '54 CV', '8 AI Match ≥90%', 'Tạm dừng', 'L4 · People'],
];

export default function HRJobsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
            Tổng quan <span>/</span> Dashboard Overview{' '}
            <Badge variant="success">AI Engine Online</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Chào buổi sáng, Alexandra 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Hệ thống AI tự động đã xuất{' '}
            <span className="font-semibold text-indigo-600">48 ứng viên tiềm năng cao</span> trong
            24 giờ qua.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Xuất báo cáo</Button>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            to="/hr/jobs/new"
          >
            <Plus className="h-4 w-4" />
            Tạo tin tuyển dụng mới
          </Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Tổng tin tuyển dụng',
            value: '18',
            note: '+2 tháng này',
            icon: BriefcaseBusiness,
          },
          {
            label: 'Ứng viên đang xử lý',
            value: '1,284',
            note: '+18.4% so với tuần trước',
            icon: Users,
          },
          { label: 'AI Match ≥ 90%', value: '342', note: 'Top 1% Talent', icon: Sparkles },
          { label: 'Lịch phỏng vấn', value: '28', note: '8 cuộc hẹn hôm nay', icon: CalendarDays },
        ].map(({ label, value, note, icon: Icon }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {label}
                </span>
                <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-4 text-3xl font-bold text-slate-900">{value}</div>
              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {note}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-0 bg-indigo-50 shadow-none">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-indigo-600 p-2 text-white">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-indigo-950">
                AI AUTONOMOUS PIPELINE{' '}
                <Badge className="ml-2 bg-emerald-100 text-emerald-700">Real-time Scoring</Badge>
              </div>
              <p className="text-xs text-indigo-800/70">
                Đã quét 4,120 hồ sơ từ LinkedIn &amp; GitHub cho vị trí “Senior AI Engineer”.
              </p>
            </div>
          </div>
          <Button variant="outline" className="bg-white">
            Xem 48 hồ sơ mới
          </Button>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Danh sách tin tuyển dụng gần đây</CardTitle>
            <p className="mt-1 text-xs text-slate-400">
              Quản lý vị trí, số lượng hồ sơ AI phân tích và tiến độ phỏng vấn
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="w-64 pl-9" placeholder="Tìm kiếm vị trí, kỹ năng..." />
            </div>
            <Button variant="outline">Tất cả phòng ban</Button>
            <Button variant="outline">Lọc nâng cao</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vị trí tuyển dụng</TableHead>
                <TableHead>Phòng ban</TableHead>
                <TableHead>Hồ sơ &amp; AI Match</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map(([title, department, cvs, match, status, level]) => (
                <TableRow key={title}>
                  <TableCell>
                    <div className="font-semibold text-slate-900">{title}</div>
                    <div className="mt-1 text-xs text-slate-400">{level}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{department}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-700">{cvs}</div>
                    <div className="text-xs text-indigo-600">{match}</div>
                    <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100">
                      <div className="h-1.5 w-3/4 rounded-full bg-indigo-600" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status === 'Đang mở' ? 'success' : 'secondary'}>{status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
