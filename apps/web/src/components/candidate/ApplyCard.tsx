import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileUp, Loader2, CircleCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import QueryError from '@/components/common/QueryError';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMyApplications } from '@/hooks/useMyApplications';
import { useApplyJob } from '@/hooks/useApplyJob';
import { queryKeys } from '@/api/queryKeys';
import { validateCv } from '@/lib/cvValidation';
import { applicationFailure } from '@/lib/applicationErrors';
import { candidateLoginUrl } from '@/lib/loginRedirect';
import { formatFileSize } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Job } from '@/types/jobs';

export default function ApplyCard({ job }: { job: Job }) {
  const session = useCurrentUser();
  const user = session.user;
  const applications = useMyApplications(user?.role === 'CANDIDATE' ? user.id : undefined);
  const mutation = useApplyJob(user?.id ?? '', job.id);
  const client = useQueryClient();
  const location = useLocation();
  const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [percent, setPercent] = useState<number | undefined>();
  const [dragging, setDragging] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [closed, setClosed] = useState(false);
  const [needsCheck, setNeedsCheck] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
  const applied =
    duplicate || mutation.isSuccess || applications.data?.some((app) => app.job.id === job.id);
  const busy = mutation.isPending;
  const pick = (files: FileList | File[]) => {
    if (request.current || !files.length) return;
    if (files.length !== 1) {
      setFile(null);
      setError('Chỉ chọn một CV cho mỗi lần nộp.');
      return;
    }
    const selected = files[0];
    const problem = validateCv(selected);
    setFile(problem ? null : selected);
    setError(problem);
  };
  const submit = async () => {
    if (
      request.current ||
      applied ||
      closed ||
      job.status !== 'OPEN' ||
      user?.role !== 'CANDIDATE' ||
      applications.isPending ||
      applications.isError ||
      applications.isFetching ||
      needsCheck
    )
      return;
    const problem = file ? validateCv(file) : 'Vui lòng chọn CV PDF trước khi nộp.';
    if (problem || !file) {
      setError(problem);
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setError(null);
    setPercent(undefined);
    try {
      await mutation.mutateAsync({
        file,
        signal: controller.signal,
        onUploadProgress: (progress) => {
          if (mounted.current) setPercent(progress.percent);
        },
      });
      if (mounted.current) {
        setFile(null);
        toast.success('Nộp CV thành công.');
      }
    } catch (cause) {
      if (!mounted.current) return;
      const failure = applicationFailure(cause);
      setError(failure.message);
      setDuplicate(failure.duplicate);
      setClosed(failure.closed);
      setNeedsCheck(failure.uncertain);
      if (failure.duplicate)
        void client.invalidateQueries({ queryKey: queryKeys.applications.mine(user.id) });
      if (failure.closed) {
        client.setQueryData<Job>(queryKeys.jobs.detail(job.id), (current) =>
          current ? { ...current, status: 'CLOSED' } : undefined,
        );
        void client.invalidateQueries({ queryKey: queryKeys.jobs.public() });
      }
    } finally {
      request.current = null;
    }
  };
  const recheck = async () => {
    const result = await applications.refetch();
    if (!mounted.current) return;
    if (result.isError) {
      setError('Không kiểm tra được hồ sơ. Hãy thử lại khi kết nối ổn định.');
      return;
    }
    setNeedsCheck(false);
    setError(
      result.data?.some((app) => app.job.id === job.id)
        ? null
        : 'Chưa ghi nhận hồ sơ cho vị trí này. Bạn có thể thử nộp lại.',
    );
  };
  let content;
  if (applied)
    content = (
      <div className="space-y-3 text-center">
        <CircleCheck className="mx-auto h-10 w-10 text-green-600" />
        <p className="font-semibold">Bạn đã nộp hồ sơ cho vị trí này</p>
        <Button disabled className="w-full">
          Đã nộp
        </Button>
        <Link className="block text-primary underline" to="/candidate/applications">
          Xem hồ sơ của tôi
        </Link>
      </div>
    );
  else if (closed || job.status === 'CLOSED')
    content = <p role="status">Vị trí này đã ngừng nhận hồ sơ.</p>;
  else if (session.isLoading) content = <p role="status">Đang kiểm tra phiên đăng nhập…</p>;
  else if (session.error)
    content = (
      <QueryError message="Không xác minh được tài khoản." retry={() => void session.retry()} />
    );
  else if (!user)
    content = (
      <div className="space-y-3">
        <p>Đăng nhập bằng tài khoản ứng viên để nộp CV.</p>
        <Link
          className="font-semibold text-primary underline"
          to={candidateLoginUrl(location.pathname + location.search)}
        >
          Đăng nhập để nộp CV
        </Link>
      </div>
    );
  else if (user.role !== 'CANDIDATE')
    content = <p role="status">Chức năng nộp CV dành cho tài khoản ứng viên.</p>;
  else if (applications.isPending) content = <p role="status">Đang kiểm tra hồ sơ đã nộp…</p>;
  else if (applications.isError && !needsCheck)
    content = (
      <QueryError
        message="Chưa kiểm tra được hồ sơ đã nộp. Vui lòng thử lại trước khi nộp CV."
        retry={() => void applications.refetch()}
      />
    );
  else
    content = (
      <div className="space-y-4">
        <input
          ref={input}
          aria-label="Chọn CV PDF"
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            if (event.target.files) pick(event.target.files);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pick(event.dataTransfer.files);
          }}
          className={cn(
            'flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center disabled:opacity-50',
            dragging ? 'border-primary bg-indigo-50' : 'border-slate-300',
          )}
        >
          <FileUp className="h-8 w-8 text-primary" />
          <span>Kéo thả CV hoặc chọn tệp</span>
          <span className="text-xs text-slate-600">Một file PDF, tối đa 5MB</span>
        </button>
        {file && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-xs">{formatFileSize(file.size)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Xóa tệp"
              disabled={busy}
              onClick={() => {
                setFile(null);
                setError(null);
              }}
            >
              <X />
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
            {error}
          </p>
        )}
        {busy && (
          <div className="space-y-2" aria-live="polite">
            <p>
              {percent === 100
                ? 'Đang kiểm tra CV…'
                : percent === undefined
                  ? 'Đang tải CV…'
                  : `Đang tải CV: ${percent}%`}
            </p>
            <Progress value={percent} label="Tiến trình tải CV" />
            <Button variant="outline" onClick={() => request.current?.abort()}>
              Hủy tải lên
            </Button>
          </div>
        )}
        {needsCheck && (
          <Button
            variant="outline"
            disabled={applications.isFetching}
            onClick={() => void recheck()}
          >
            {applications.isFetching ? 'Đang kiểm tra…' : 'Kiểm tra trạng thái hồ sơ'}
          </Button>
        )}
        <Button
          className="w-full"
          disabled={busy || needsCheck || applications.isFetching}
          onClick={() => void submit()}
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin" />
              Đang xử lý hồ sơ…
            </>
          ) : (
            'Nộp CV'
          )}
        </Button>
        <p className="text-xs text-slate-600">
          Chỉ thông báo thành công sau khi máy chủ xác nhận tiếp nhận hồ sơ.
        </p>
      </div>
    );
  return (
    <Card className="p-6">
      <h2 className="mb-4 text-card-title">Ứng tuyển vị trí này</h2>
      {content}
    </Card>
  );
}
