import type { CSSProperties } from 'react';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { CANDIDATE_STEPS, type CandidateProgress } from '@/lib/candidateStatus';
import { cn } from '@/lib/utils';

type StepState = 'done' | 'pending' | 'failed' | 'upcoming';

/** Xong = xanh lá, đang chờ = xanh dương, thất bại = đỏ, chưa tới = xám. */
const circleStyle: Record<StepState, string> = {
  done: 'bg-green-600 text-white',
  pending: 'border-2 border-blue-500 bg-blue-50 text-blue-600 ring-4 ring-blue-100',
  failed: 'bg-rose-600 text-white ring-4 ring-rose-100',
  upcoming: 'border border-slate-300 bg-slate-50 text-slate-400',
};

const labelStyle: Record<StepState, string> = {
  done: 'font-medium text-green-800',
  pending: 'font-semibold text-blue-700',
  failed: 'font-semibold text-rose-700',
  upcoming: 'text-slate-500',
};

/** Horizontal 4-step tracker: Đã nộp → Xét duyệt CV → Phỏng vấn → Kết quả. */
export default function ApplicationSteps({ progress }: { progress: CandidateProgress }) {
  const { step: current, tone } = progress;

  const stateOf = (index: number): StepState => {
    if (index < current) return 'done';
    if (index > current) return 'upcoming';
    if (tone === 'success') return 'done';
    if (tone === 'failed') return 'failed';
    return 'pending';
  };

  return (
    <div className="relative flex items-start justify-between py-2">
      {/* Lines run between the first and last circle centres (half a column from each edge). */}
      <div className="absolute left-8 right-8 top-6 h-0.5 bg-slate-200 sm:left-10 sm:right-10" />
      {/* Mọi bước trước bước hiện tại đều đã xong nên đoạn đã đi qua luôn màu xanh lá. */}
      <div
        className="absolute left-8 top-6 h-0.5 w-[calc((100%_-_4rem)*var(--progress))] bg-green-500 sm:left-10 sm:w-[calc((100%_-_5rem)*var(--progress))]"
        style={{ '--progress': current / (CANDIDATE_STEPS.length - 1) } as CSSProperties}
      />
      {CANDIDATE_STEPS.map((label, index) => {
        const state = stateOf(index);
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
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
                circleStyle[state],
              )}
            >
              {state === 'done' ? (
                <Check className="h-4 w-4" />
              ) : state === 'failed' ? (
                <X className="h-4 w-4" />
              ) : state === 'pending' ? (
                tone === 'action' ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn('text-center text-[11px] leading-tight sm:text-xs', labelStyle[state])}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
