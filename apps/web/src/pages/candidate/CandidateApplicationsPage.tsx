import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FolderOpen,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const applications = [
  {
    title: 'Senior AI / Machine Learning Engineer',
    company: 'Acme AI Labs',
    score: '96%',
    status: 'Phỏng vấn',
    date: '20/10/2024',
    color: 'indigo',
  },
  {
    title: 'Lead Fullstack Engineer (React & Golang)',
    company: 'VNG Cloud & Fintech',
    score: '89%',
    status: 'AI đang xử lý',
    date: '19/10/2024',
    color: 'violet',
  },
  {
    title: 'Data Scientist (NLP & Recommendation Systems)',
    company: 'VinCommerce AI',
    score: '91%',
    status: 'Nhận Offer',
    date: '05/10/2024',
    color: 'emerald',
  },
  {
    title: 'Staff Product Designer (Design Systems & AI/UX)',
    company: 'Nexus Autonomous Tech',
    score: '84%',
    status: 'Đang đợi',
    date: '15/10/2024',
    color: 'slate',
  },
];

export default function CandidateApplicationsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 text-xs text-slate-400">
            Cổng ứng viên <span className="mx-1">/</span> Lịch sử ứng tuyển
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Lịch sử &amp; Tiến độ ứng tuyển
            </h1>
            <Badge variant="success">Live Sync 2m trước</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi trạng thái đối soát AI, lịch phỏng vấn và kết quả ứng tuyển theo thời gian
            thực.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Xuất báo cáo (PDF)
          </Button>
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700" asChild>
            <Link to="/candidate/jobs">
              <Search className="h-4 w-4" />
              Tìm việc làm mới
            </Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Tổng hồ sơ đã nộp',
            value: '12',
            note: '+3 hồ sơ mới tháng 10',
            icon: FolderOpen,
          },
          { label: 'AI đang xử lý', value: '4', note: 'Độ khớp TB: 88%', icon: Sparkles },
          {
            label: 'Vào vòng phỏng vấn',
            value: '5',
            note: '2 lịch phỏng vấn tuần này',
            icon: CalendarDays,
          },
          { label: 'Đã nhận Offer', value: '1', note: 'Acme AI Labs · 65M+', icon: CheckCircle2 },
        ].map(({ label, value, note, icon: Icon }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
                <Icon className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="mt-4 text-3xl font-bold text-slate-900">{value}</div>
              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
                <TrendingUp className="h-3 w-3" />
                {note}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Tìm kiếm theo vị trí, tên công ty, kỹ năng..." />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              'Tất cả (12)',
              'AI Đang xử lý (4)',
              'Phỏng vấn (5)',
              'Nhận Offer (1)',
              'Đã từ chối (2)',
            ].map((item, index) => (
              <Button key={item} size="sm" variant={index === 0 ? 'default' : 'secondary'}>
                {item}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {applications.map((application, index) => (
          <Card
            key={application.title}
            className={`overflow-hidden border-0 shadow-sm ${application.color === 'emerald' ? 'border-t-2 border-t-emerald-600' : 'border-t-2 border-t-indigo-600'}`}
          >
            <CardContent className="p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                    {application.company.slice(0, 1)}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{application.title}</h2>
                      <Badge
                        variant={application.status === 'Nhận Offer' ? 'success' : 'secondary'}
                      >
                        {application.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {application.company} · Hà Nội (Hybrid) · Ngày nộp: {application.date}
                    </p>
                  </div>
                </div>
                <Badge variant={application.status === 'Nhận Offer' ? 'success' : 'default'}>
                  <Sparkles className="mr-1 h-3 w-3" />
                  {application.score} AI Match
                </Badge>
              </div>
              <div className="mt-5 grid gap-2 rounded-xl bg-slate-50 p-4 md:grid-cols-4">
                {['1. Đã nộp CV', '2. AI đối soát', '3. Phỏng vấn', '4. Nhận Offer'].map(
                  (step, stepIndex) => (
                    <div
                      key={step}
                      className={`rounded-lg p-3 text-xs ${stepIndex < (index === 0 ? 3 : index === 2 ? 4 : index + 2) ? 'bg-white' : 'text-slate-400'}`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-slate-700">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full ${stepIndex <= (index === 0 ? 2 : index === 2 ? 3 : 1) ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-400'}`}
                        >
                          {stepIndex <= (index === 0 ? 2 : index === 2 ? 3 : 1)
                            ? '✓'
                            : stepIndex + 1}
                        </span>
                        {step}
                      </div>
                      <p className="mt-1 pl-7 text-[11px] text-slate-400">
                        {stepIndex === 0
                          ? application.date
                          : stepIndex === 1
                            ? 'Đạt 91/100'
                            : stepIndex === 2 && index === 0
                              ? 'Đang diễn ra'
                              : 'Chưa đến bước này'}
                      </p>
                    </div>
                  ),
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  Cập nhật trạng thái theo thời gian thực
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/candidate/jobs/ai-engineer">Xem chi tiết tin tuyển dụng</Link>
                  </Button>
                  <Button size="sm" variant="outline">
                    Xem CV đã nộp <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
