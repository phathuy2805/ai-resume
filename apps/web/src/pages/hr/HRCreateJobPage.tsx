import {
  CheckCircle2,
  ChevronDown,
  DollarSign,
  FileText,
  MapPin,
  Plus,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const skills = [
  'Python (FastAPI)',
  'PyTorch',
  'LLM Fine-tuning',
  'LangChain / LlamaIndex',
  'Vector DB (Milvus)',
  'Kubernetes / Docker',
];

export default function HRCreateJobPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <div className="text-xs text-slate-400">
            Tổng quan <span className="mx-1">/</span> Tin tuyển dụng <span className="mx-1">/</span>{' '}
            <span className="text-slate-700">Tạo tin mới</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Tạo tin tuyển dụng mới</h1>
          <Badge variant="success" className="mt-2">
            Tự động lưu nháp 2 phút trước
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link
            className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            to="/hr/jobs"
          >
            Hủy
          </Link>
          <Button variant="outline">Lưu nháp</Button>
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Sparkles className="h-4 w-4" />
            Đăng tin tuyển dụng
          </Button>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="rounded-md bg-indigo-50 p-1.5 text-indigo-600">1</span>Thông tin cơ
                bản
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Tiêu đề vị trí tuyển dụng *</Label>
                <Input defaultValue="Senior AI / Machine Learning Engineer" />
              </div>
              <div className="space-y-1.5">
                <Label>Phòng ban trực thuộc *</Label>
                <div className="relative">
                  <Input defaultValue="AI Labs & R&D Platform" />
                  <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Số lượng tuyển dụng</Label>
                <Input defaultValue="2" type="number" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Cấp bậc tuyển dụng (Seniority Level) *</Label>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-xs sm:grid-cols-6">
                  {['Intern', 'Junior', 'Mid-level', 'Senior L4', 'Lead L5', 'Principal L6'].map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        className={
                          item === 'Senior L4'
                            ? 'rounded-md bg-white py-2 font-semibold text-slate-900 shadow-sm'
                            : 'rounded-md py-2 text-slate-500'
                        }
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>
                  <MapPin className="mr-1 inline h-3.5 w-3.5" />
                  Địa điểm làm việc cụ thể
                </Label>
                <Input defaultValue="Tầng 18, Keangnam Landmark 72, Nam Từ Liêm, Hà Nội" />
              </div>
              <div className="space-y-1.5">
                <Label>
                  <DollarSign className="mr-1 inline h-3.5 w-3.5" />
                  Mức lương dự kiến (Gross)
                </Label>
                <Input defaultValue="45,000,000 - 75,000,000 VNĐ" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Hình thức hợp đồng &amp; Mô hình làm việc</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input defaultValue="Toàn thời gian" />
                  <Input defaultValue="Linh hoạt (Hybrid)" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="rounded-md bg-indigo-50 p-1.5 text-indigo-600">2</span>Chi tiết
                công việc &amp; Đãi ngộ{' '}
                <Badge variant="secondary" className="ml-auto">
                  Soạn thảo bằng AI
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Mô tả trách nhiệm (Responsibilities)
                </div>
                <p>
                  • Nghiên cứu, thiết kế và phát triển các mô hình AI/LLM phục vụ hệ thống tuyển
                  dụng tự động Autonomous Agent.
                </p>
                <p className="mt-2">
                  • Tích hợp các mô hình ngôn ngữ lớn và xây dựng pipeline đánh giá chất lượng.
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <div className="mb-2 font-semibold text-slate-900">
                  Yêu cầu ứng viên (Requirements)
                </div>
                <p>
                  • Tối thiểu 3 năm kinh nghiệm phát triển Machine Learning / NLP trong môi trường
                  production.
                </p>
                <p className="mt-2">• Thành thạo Python, PyTorch, Hugging Face Transformers.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <div className="mb-2 font-semibold text-slate-900">
                  Quyền lợi &amp; Chế độ đãi ngộ
                </div>
                <p>• Thu nhập cạnh tranh, thưởng hiệu suất và bảo hiểm sức khỏe toàn diện.</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <WandSparkles className="h-4 w-4 text-indigo-600" />
                Tiêu chí &amp; AI Matching{' '}
                <Badge variant="success" className="ml-auto">
                  Auto-Scan
                </Badge>
              </CardTitle>
              <p className="text-xs text-slate-400">
                Mô hình đối soát CV tự động sẽ tìm ứng viên phù hợp.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Kỹ năng bắt buộc (Must-have)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                  <button type="button" className="flex items-center gap-1 text-xs text-slate-400">
                    <Plus className="h-3 w-3" />
                    Thêm kỹ năng
                  </button>
                </div>
              </div>
              <div>
                <Label>Kinh nghiệm tối thiểu</Label>
                <div className="mt-3 h-2 rounded-full bg-indigo-100">
                  <div className="h-2 w-1/2 rounded-full bg-indigo-600" />
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>3 năm</span>
                  <span>5 năm</span>
                  <span>10+ năm</span>
                </div>
              </div>
              <div>
                <Label>Yêu cầu trình độ học vấn</Label>
                <Input
                  className="mt-2"
                  defaultValue="Cử nhân Công nghệ thông tin / Khoa học máy tính"
                />
              </div>
              <div className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-900">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                  Kích hoạt AI Autonomous Sourcing
                </div>
                <p className="mt-2 text-indigo-800/70">
                  Bot AI sẽ tự động phân tích và đề xuất ứng viên từ các nguồn kết nối.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Độ hoàn thiện tuyển dụng</h3>
                <Badge variant="success">Xuất sắc</Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-indigo-600 text-lg font-bold text-indigo-700">
                  92<span className="text-xs">%</span>
                </div>
                <div className="text-xs text-slate-500">
                  <p>JD Chất lượng cao</p>
                  <p className="mt-1">Bạn đang có năng lực tiếp cận ứng viên tốt.</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li>
                  ✓ Tiêu đề rõ ràng, chuẩn SEO ngành Tech{' '}
                  <span className="float-right text-emerald-600">+20 điểm</span>
                </li>
                <li>
                  ✓ Khung lương minh bạch thu hút ứng viên{' '}
                  <span className="float-right text-emerald-600">+30 điểm</span>
                </li>
                <li>
                  ✓ Đã cài đặt kỹ năng cốt lõi cho AI đối soát{' '}
                  <span className="float-right text-emerald-600">+25 điểm</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
