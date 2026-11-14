import {
  Bookmark,
  Building2,
  Clock3,
  MapPin,
  Search,
  Share2,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const jobs = [
  {
    company: 'Acme AI Labs',
    title: 'Senior AI / Machine Learning Engineer',
    location: 'Hà Nội (Hybrid)',
    salary: '45,000,000 - 75,000,000 VNĐ',
    score: '96%',
    logo: 'A',
    tags: ['Python', 'PyTorch', 'LLM Fine-tuning', 'RAG'],
  },
  {
    company: 'VNG Cloud & Fintech',
    title: 'Lead Fullstack Engineer (React & Golang)',
    location: 'TP. Hồ Chí Minh',
    salary: '50,000,000 - 80,000,000 VNĐ',
    score: '89%',
    logo: 'V',
    tags: ['React', 'TypeScript', 'Go', 'Kubernetes'],
  },
  {
    company: 'Nexus Autonomous Tech',
    title: 'Staff Product Designer (Design Systems & AI/UX)',
    location: 'Remote toàn quốc',
    salary: '$2,200 - $3,500 / tháng',
    score: '84%',
    logo: 'N',
    tags: ['Figma', 'Design Systems', 'User Research'],
  },
  {
    company: 'FinX Global',
    title: 'DevOps & Cloud Platform Engineer (AWS/K8s)',
    location: 'Hà Nội',
    salary: '35,000,000 - 55,000,000 VNĐ',
    score: '78%',
    logo: 'F',
    tags: ['AWS', 'Kubernetes', 'Terraform', 'Docker'],
  },
];

export default function CandidateJobsPage() {
  const selected = jobs[0];
  return (
    <div className="min-h-full bg-slate-50 -mx-4 -my-6 pb-8">
      <section className="relative overflow-hidden bg-white px-4 py-10 sm:px-8 lg:px-12">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-100 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <Badge variant="success">Hệ thống phân tích tương thích CV thời gian thực v2.4</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Khám phá cơ hội công nghệ đỉnh cao cùng{' '}
            <span className="text-indigo-600">AI Matching</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Thuật toán AI tự động đối soát kỹ năng và gợi ý các vị trí phù hợp &gt;85% với hồ sơ của
            bạn.
          </p>
          <div className="mt-6 grid gap-2 rounded-xl bg-slate-50 p-2 lg:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="border-0 bg-white pl-9"
                defaultValue="Senior AI / Machine Learning"
              />
            </div>
            <select className="rounded-md border-0 bg-white px-3 text-sm text-slate-700">
              <option>Hà Nội (Hybrid)</option>
              <option>TP. Hồ Chí Minh</option>
              <option>Remote / Từ xa</option>
            </select>
            <select className="rounded-md border-0 bg-white px-3 text-sm text-slate-700">
              <option>Senior / Lead</option>
              <option>Middle</option>
              <option>Junior / Fresher</option>
            </select>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Search className="h-4 w-4" />
              Tìm kiếm
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="bg-indigo-100 text-indigo-700">
              <Sparkles className="mr-1 h-3 w-3" />
              AI / Machine Learning (Top Match)
            </Badge>
            {['Remote linh hoạt', 'Lương > $2,500', 'Công ty Unicorn', 'Mới đăng 24h'].map(
              (item) => (
                <Badge key={item} variant="secondary">
                  {item}
                </Badge>
              ),
            )}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-12 lg:px-8">
        <div className="space-y-3 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <strong className="text-lg text-slate-900">142</strong>
              <span className="ml-1 text-sm text-slate-500">việc làm phù hợp</span>
            </div>
            <select className="bg-transparent text-xs font-semibold text-slate-700">
              <option>Phù hợp nhất (AI Match)</option>
              <option>Mới nhất</option>
            </select>
          </div>
          {jobs.map((job, index) => (
            <Card
              key={job.title}
              className={`cursor-pointer border-0 shadow-sm transition hover:shadow-md ${index === 0 ? 'ring-2 ring-indigo-600' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-500 font-bold text-white">
                    {job.logo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{job.company}</p>
                      <Badge variant="success">
                        <Sparkles className="mr-1 h-3 w-3" />
                        {job.score} Phù hợp
                      </Badge>
                    </div>
                    <h2 className="mt-1 text-base font-bold leading-tight text-slate-900">
                      {job.title}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{job.salary}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        Đăng 2 giờ trước
                      </span>
                      <button type="button" className="p-1 hover:text-indigo-600">
                        <Bookmark className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="hidden border-0 shadow-sm lg:sticky lg:top-20 lg:col-span-7 lg:block lg:self-start">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
                  {selected.logo}
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selected.company}</h2>
                  <p className="text-xs text-slate-400">
                    <MapPin className="mr-1 inline h-3 w-3" />
                    {selected.location}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="icon">
                  <Bookmark className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <h1 className="mt-6 text-2xl font-bold text-slate-900">{selected.title}</h1>
            <p className="mt-1 text-xs text-emerald-700">
              Mã tuyển dụng: #AI-2025-084 · Tuyển gấp (Active hiring)
            </p>
            <div className="mt-5 flex items-center justify-between rounded-xl bg-emerald-50 p-4">
              <div>
                <div className="flex items-center gap-2 font-semibold text-emerald-900">
                  <Sparkles className="h-4 w-4" />
                  Điểm tương thích hồ sơ: 96%
                </div>
                <p className="mt-1 text-xs text-emerald-700">
                  Hồ sơ của bạn khớp 5/5 kỹ năng bắt buộc.
                </p>
              </div>
              <Badge variant="success">TOP 2% ỨNG VIÊN</Badge>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-slate-400">Lương cơ bản</span>
                <b className="mt-1 block text-slate-800">45M - 75M VNĐ</b>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-slate-400">Mô hình</span>
                <b className="mt-1 block text-slate-800">Hybrid</b>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-slate-400">Cấp bậc</span>
                <b className="mt-1 block text-slate-800">Senior / Lead</b>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-slate-400">Kinh nghiệm</span>
                <b className="mt-1 block text-slate-800">3 - 5 năm</b>
              </div>
            </div>
            <div className="mt-6 border-b text-sm">
              <span className="inline-block border-b-2 border-indigo-600 px-4 pb-3 font-semibold text-slate-900">
                Mô tả công việc
              </span>
            </div>
            <div className="space-y-4 py-5 text-sm leading-6 text-slate-600">
              <div>
                <h3 className="font-semibold text-slate-900">Về vai trò công việc</h3>
                <p className="mt-1">
                  Tại Acme AI Labs, chúng tôi đang xây dựng hệ tiếp theo của nền tảng tuyển dụng tự
                  động và tìm kiếm ứng viên thông minh.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Trách nhiệm chính</h3>
                <p className="mt-1">
                  Thiết kế và tối ưu kiến trúc Retrieval-Augmented Generation phục vụ đối soát CV
                  thời gian thực và fine-tune các mô hình ngôn ngữ.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Yêu cầu ứng viên</h3>
                <p className="mt-1">
                  Tối thiểu 3 năm kinh nghiệm phát triển Machine Learning/NLP và thành thạo Python,
                  PyTorch, Hugging Face.
                </p>
              </div>
            </div>
            <Button className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700" asChild>
              <Link to="/candidate/jobs/ai-engineer">Nộp hồ sơ ngay (1-Click Apply)</Link>
            </Button>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <Building2 className="h-4 w-4" />
              Acme AI Labs · <Users className="h-4 w-4" />
              50-100 nhân sự · <Star className="h-4 w-4 text-amber-500" />
              4.9
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
