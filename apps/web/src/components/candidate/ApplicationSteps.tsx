import type { CSSProperties } from 'react';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { CANDIDATE_STEPS, type CandidateProgress } from '@/lib/applicationStatus';
import { cn } from '@/lib/utils';

const lineColor = {
  neutral: 'bg-primary',
  progress: 'bg-amber-400',
  action: 'bg-primary',
  success: 'bg-green-500',
  failed: 'bg-rose-300',
};

/** Horizontal 5-step tracker: Đã nộp → Đánh giá CV → Phỏng vấn AI → Chờ kết quả → Kết quả. */
export default function ApplicationSteps({ progress }: { progress: CandidateProgress }) {
  const { step: current, tone } = progress;
  return (
    <div className="relative flex items-start justify-between py-2">
      {/* Lines run between the first and last circle centres (half a column from each edge). */}
      <div className="absolute left-8 right-8 top-6 h-0.5 bg-slate-200 sm:left-10 sm:right-10" />
      <div
        className={cn(
          'absolute left-8 top-6 h-0.5 w-[calc((100%_-_4rem)*var(--progress))] sm:left-10 sm:w-[calc((100%_-_5rem)*var(--progress))]',
          lineColor[tone],
        )}
        style={{ '--progress': current / (CANDIDATE_STEPS.length - 1) } as CSSProperties}
      />
      {CANDIDATE_STEPS.map((label, index) => {
        const done = index < current || (index === current && tone === 'success');
        const active = index === current && tone !== 'success';
        const skipped = tone === 'failed' && index > current;
        return (
          <div
            key={label}
            className={cn(
              'relative z-10 flex w-16 flex-col items-center gap-2 sm:w-20',
              skipped && 'opacity-50',
            )}
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full bg-card text-xs font-medium',
                done &&
                  (tone === 'success'
                    ? 'bg-green-600 text-white'
                    : tone === 'failed'
                      ? 'bg-slate-200 text-slate-600'
                      : 'bg-primary text-white'),
                done && index === current && 'ring-4 ring-green-100',
                active &&
                  tone === 'progress' &&
                  'border-2 border-amber-500 bg-amber-50 text-amber-600 ring-4 ring-amber-100',
                active && tone === 'action' && 'bg-primary text-white ring-4 ring-indigo-100',
                active && tone === 'neutral' && 'bg-primary text-white ring-4 ring-indigo-100',
                active && tone === 'failed' && 'border border-rose-300 bg-rose-100 text-rose-600',
                !done && !active && 'border border-slate-300 bg-slate-50 text-slate-400',
              )}
            >
              {done ? (
                <Check className="h-4 w-4" />
              ) : active && tone === 'progress' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : active && tone === 'action' ? (
                <Sparkles className="h-4 w-4" />
              ) : active && tone === 'failed' ? (
                <X className="h-4 w-4" />
              ) : active ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                'text-center text-[11px] leading-tight sm:text-xs',
                done || active ? 'font-medium text-foreground' : 'text-slate-500',
                active && tone === 'progress' && 'font-semibold text-amber-800',
                active && tone === 'action' && 'font-semibold text-primary',
                active && tone === 'failed' && 'font-semibold text-rose-800',
                done && index === current && 'font-semibold text-green-800',
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
