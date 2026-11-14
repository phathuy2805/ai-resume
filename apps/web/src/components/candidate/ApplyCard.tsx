import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { AlertCircle, ArrowRight, CircleCheck, FileText, FileUp, Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatFileSize } from '@/lib/format';
import { cn } from '@/lib/utils';

const MAX_SIZE = 5 * 1024 * 1024;

type UploadState = { kind: 'idle' } | { kind: 'uploading'; percent: number } | { kind: 'success' };

function validate(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'Chỉ chấp nhận tệp PDF (Tệp của bạn không đúng định dạng)';
  if (file.size > MAX_SIZE) return 'Tệp vượt quá dung lượng cho phép (tối đa 5MB)';
  return null;
}

const pillTone = {
  info: 'bg-blue-100 text-slate-600',
  danger: 'bg-red-100 text-red-800',
  primary: 'bg-indigo-100 text-indigo-700',
};

function CardShell({
  pill,
  invalid,
  children,
}: {
  pill?: { label: string; tone: keyof typeof pillTone };
  invalid?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className={cn('p-6 shadow-sm', invalid && 'border-red-200')}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-card-title text-foreground">Ứng tuyển vị trí này</h3>
        {pill && (
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', pillTone[pill.tone])}>
            {pill.label}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-4">
        {children}
        <p className="text-center text-xs text-slate-600">
          CV của bạn chỉ được dùng cho mục đích tuyển dụng.
        </p>
      </div>
    </Card>
  );
}

/** Right-column card on the job detail page: pick a PDF, upload with progress, confirm. */
export default function ApplyCard({ alreadyApplied }: { alreadyApplied: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<UploadState>(
    alreadyApplied ? { kind: 'success' } : { kind: 'idle' },
  );
  const timer = useRef<number | undefined>(undefined);
  // Stop the simulated upload once it finishes, is cancelled, or the card unmounts.
  useEffect(() => {
    if (state.kind !== 'uploading') window.clearInterval(timer.current);
  }, [state.kind]);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const pick = (candidate: File | undefined) => {
    if (!candidate) return;
    const problem = validate(candidate);
    setError(problem);
    setFile(problem ? null : candidate);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files[0]);
  };

  const removeFile = () => {
    setFile(null);
    setState({ kind: 'idle' });
  };

  // TODO(W1-FE-05): replace the simulated progress with applyJob(jobId, file, { onUploadProgress, signal }).
  const submit = () => {
    if (!file) {
      setError('Vui lòng chọn CV (PDF) trước khi nộp hồ sơ');
      return;
    }
    setError(null);
    setState({ kind: 'uploading', percent: 0 });
    timer.current = window.setInterval(() => {
      setState((current) => {
        if (current.kind !== 'uploading') return current;
        const percent = Math.min(100, current.percent + 10);
        return percent === 100 ? { kind: 'success' } : { kind: 'uploading', percent };
      });
    }, 300);
  };

  if (state.kind === 'success') {
    return (
      <CardShell pill={{ label: 'Nộp thành công', tone: 'primary' }}>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-primary">
            <CircleCheck className="h-7 w-7" />
          </span>
          <div>
            <h4 className="mb-1 text-card-title text-foreground">
              {alreadyApplied
                ? 'Bạn đã nộp hồ sơ cho vị trí này'
                : 'Đã nộp hồ sơ! AI đang đánh giá CV của bạn'}
            </h4>
            <p className="mx-auto max-w-sm text-slate-600">
              Hệ thống AI sẽ tự động phân tích độ phù hợp và cập nhật kết quả trong mục Hồ sơ của
              tôi.
            </p>
          </div>
          <Link
            to="/candidate/applications"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            Xem Hồ sơ của tôi
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 py-2 text-xs font-medium text-indigo-700">
            <CircleCheck className="h-4 w-4" />
            Đã hoàn tất nộp hồ sơ
          </div>
        </div>
      </CardShell>
    );
  }

  const uploading = state.kind === 'uploading';
  const pill = uploading
    ? { label: `Đang tải ${state.percent}%`, tone: 'info' as const }
    : error
      ? { label: 'Báo lỗi', tone: 'danger' as const }
      : undefined;

  return (
    <CardShell pill={pill} invalid={!!error}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {file ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-indigo-50/40 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-6 w-6 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{file.name}</p>
              <p className="text-xs text-slate-600">
                {formatFileSize(file.size)} · Định dạng hợp lệ
              </p>
            </div>
          </div>
          <button
            type="button"
            title={uploading ? 'Huỷ tải lên' : 'Xoá tệp'}
            aria-label={uploading ? 'Huỷ tải lên' : 'Xoá tệp'}
            onClick={removeFile}
            className="rounded p-1 text-slate-600 transition-colors hover:text-destructive"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-4 text-center transition-colors',
            error
              ? 'border-red-300 bg-red-50/50'
              : dragging
                ? 'border-primary bg-indigo-50'
                : 'border-slate-300 hover:border-primary hover:bg-indigo-50/40',
          )}
        >
          <span
            className={cn(
              'mb-1 flex h-9 w-9 items-center justify-center rounded-full',
              error ? 'bg-red-100 text-red-600' : 'bg-indigo-50 text-primary',
            )}
          >
            <FileUp className="h-5 w-5" />
          </span>
          <span className="font-medium text-foreground">
            Kéo thả CV (PDF, tối đa 5MB) hoặc{' '}
            <span className="text-primary underline">chọn tệp</span>
          </span>
          <span className="text-xs text-slate-600">
            Hỗ trợ chuẩn PDF tuyển dụng để AI quét dữ liệu tốt nhất
          </span>
        </button>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-2.5 font-medium text-red-700"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {uploading && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-primary">
            <span>Đang tải lên...</span>
            <span>{state.percent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${state.percent}%` }}
            />
          </div>
        </div>
      )}

      <Button
        className="h-9 w-full disabled:bg-primary/60 disabled:opacity-100"
        onClick={submit}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="animate-spin" />
            Đang xử lý hồ sơ...
          </>
        ) : (
          'Nộp hồ sơ'
        )}
      </Button>
    </CardShell>
  );
}
