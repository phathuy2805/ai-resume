import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  DollarSign,
  MapPin,
  Send,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CandidateJobDetailPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600"
        to="/candidate/jobs"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách việc làm
      </Link>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row">
            <div className="flex gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 text-2xl font-bold text-white">
                A
              </span>
              <div>
                <Badge variant="success">Đang tuyển</Badge>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">
                  Senior AI / Machine Learning Engineer
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Acme AI Labs · <MapPin className="mx-1 inline h-3.5 w-3.5" />
                  Hà Nội (Hybrid)
                </p>
              </div>
            </div>
            <Badge className="h-fit gap-1 bg-emerald-100 py-2 text-emerald-700">
              <Sparkles className="h-4 w-4" />
              96% AI Match
            </Badge>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <DollarSign className="h-4 w-4 text-indigo-600" />
              <span className="mt-2 block text-xs text-slate-400">Mức lương</span>
              <b className="mt-1 block text-sm text-slate-800">45M - 75M VNĐ</b>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <BriefcaseBusiness className="h-4 w-4 text-indigo-600" />
              <span className="mt-2 block text-xs text-slate-400">Mô hình</span>
              <b className="mt-1 block text-sm text-slate-800">Hybrid</b>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <Clock3 className="h-4 w-4 text-indigo-600" />
              <span className="mt-2 block text-xs text-slate-400">Cấp bậc</span>
              <b className="mt-1 block text-sm text-slate-800">Senior / Lead</b>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <MapPin className="h-4 w-4 text-indigo-600" />
              <span className="mt-2 block text-xs text-slate-400">Kinh nghiệm</span>
              <b className="mt-1 block text-sm text-slate-800">3 - 5 năm</b>
            </div>
          </div>
          <div className="mt-7 rounded-xl bg-indigo-50 p-4">
            <div className="flex items-center gap-2 font-semibold text-indigo-900">
              <Sparkles className="h-4 w-4" />
              Điểm tương thích hồ sơ của bạn: 96%
            </div>
            <p className="mt-1 text-sm text-indigo-800/70">
              Bạn phù hợp với 5/5 kỹ năng bắt buộc và có kinh nghiệm nổi bật về RAG.
            </p>
          </div>
          <div className="mt-8 space-y-6 text-sm leading-6 text-slate-600">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">Về vai trò công việc</h2>
              <p className="mt-2">
                Tại Acme AI Labs, chúng tôi đang xây dựng thế hệ tiếp theo của nền tảng tuyển dụng
                tự động và tìm kiếm ứng viên thông minh.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900">Trách nhiệm chính</h2>
              <ul className="mt-2 space-y-2">
                {[
                  'Thiết kế và tối ưu kiến trúc Retrieval-Augmented Generation phục vụ đối soát CV thời gian thực.',
                  'Fine-tune các mô hình ngôn ngữ lớn trên hạ tầng GPU clusters.',
                  'Xây dựng hệ thống Vector Indexing quản lý hàng triệu embedding vectors.',
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-indigo-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900">Yêu cầu ứng viên</h2>
              <ul className="mt-2 space-y-2">
                {[
                  'Tối thiểu 3 năm kinh nghiệm phát triển Machine Learning/NLP.',
                  'Thành thạo Python, PyTorch, Hugging Face Transformers.',
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-indigo-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <Button className="mt-8 w-full gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Send className="h-4 w-4" />
            Nộp hồ sơ ứng tuyển (1-Click Apply)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
