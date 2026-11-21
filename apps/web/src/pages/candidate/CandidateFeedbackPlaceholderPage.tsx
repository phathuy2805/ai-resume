import { ArrowLeft, MessageSquareText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card } from '@/components/ui/card';

/** Trang placeholder cho tính năng xem phản hồi kết quả (sẽ triển khai chi tiết ở W3-FE-03). */
export default function CandidateFeedbackPlaceholderPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col gap-6 py-6">
      <Link
        to="/candidate/applications"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách hồ sơ
      </Link>

      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
          <MessageSquareText className="h-6 w-6" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-page-title text-foreground">Phản hồi kết quả hồ sơ</h1>
          <p className="max-w-md text-sm text-slate-600">
            Tính năng xem nhận xét chi tiết và đánh giá từ nhà tuyển dụng đang được phát triển (W3-FE-03).
          </p>
          {id && (
            <p className="text-xs font-mono text-muted-foreground">
              Mã hồ sơ: {id}
            </p>
          )}
        </div>
        <Link
          to="/candidate/applications"
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-2 h-9' })}
        >
          Quay lại hồ sơ của tôi
        </Link>
      </Card>
    </div>
  );
}
