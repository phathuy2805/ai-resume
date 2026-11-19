import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCloseJob, useReopenJob } from '@/hooks/useJobs';
import { cn } from '@/lib/utils';
import type { Job } from '@/types/jobs';

const COPY = {
  close: {
    title: 'Đóng tin tuyển dụng?',
    description:
      'Ứng viên sẽ không còn thấy và không nộp được CV vào tin này. Hồ sơ đã nộp vẫn được giữ nguyên, bạn có thể mở lại tin bất cứ lúc nào.',
    confirm: 'Đóng tin',
    success: (title: string) => `Đã đóng tin "${title}"`,
    confirmClassName: 'bg-red-600 hover:bg-red-700',
  },
  reopen: {
    title: 'Mở lại tin tuyển dụng?',
    description:
      'Tin sẽ hiển thị lại cho ứng viên và nhận CV mới. Cấu hình sàng lọc và hồ sơ cũ được giữ nguyên.',
    confirm: 'Mở lại tin',
    success: (title: string) => `Đã mở lại tin "${title}"`,
    confirmClassName: 'bg-primary hover:bg-primary/90',
  },
} as const;

/**
 * Confirms closing an OPEN job or reopening a CLOSED one. The action follows `job.status`.
 * Pass `job = null` to hide the dialog.
 */
export default function JobStatusDialog({
  job,
  onOpenChange,
}: {
  job: Job | null;
  onOpenChange: (open: boolean) => void;
}) {
  const closeJob = useCloseJob();
  const reopenJob = useReopenJob();
  const action = job?.status === 'CLOSED' ? 'reopen' : 'close';
  const copy = COPY[action];

  const confirm = () => {
    if (!job) return;
    const mutation = action === 'close' ? closeJob : reopenJob;
    // Errors are shown by the global mutation error toast.
    mutation.mutate(job.id, { onSuccess: () => toast.success(copy.success(job.title)) });
  };

  return (
    <AlertDialog open={!!job} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{job?.title}</span>
            <br />
            {copy.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-slate-50">
            Huỷ
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              'inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-white',
              copy.confirmClassName,
            )}
            onClick={confirm}
          >
            {copy.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
