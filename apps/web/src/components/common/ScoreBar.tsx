import { scoreTone } from '@/lib/applicationStatus';
import { cn } from '@/lib/utils';

const toneClass = {
  success: { bar: 'bg-primary', text: 'text-foreground', label: 'text-slate-600' },
  warning: { bar: 'bg-amber-500', text: 'text-foreground', label: 'text-amber-700' },
  danger: { bar: 'bg-red-500', text: 'text-red-600', label: 'text-red-600' },
};

function scoreLabel(score: number, threshold: number) {
  if (score >= 90) return 'Xuất sắc';
  if (score >= 80) return 'Tốt';
  if (score >= threshold) return 'Đạt';
  if (score >= threshold - 20) return 'Trung bình';
  return 'Không đạt';
}

/** "92/100 · Xuất sắc" with a thin progress bar coloured against the job threshold. */
export default function ScoreBar({ score, threshold = 70 }: { score: number; threshold?: number }) {
  const tone = toneClass[scoreTone(score, threshold)];
  return (
    <div className="flex w-28 flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className={cn('font-semibold', tone.text)}>
          {score}
          <span className="font-normal text-muted-foreground">/100</span>
        </span>
        <span className={cn('text-[11px] font-medium', tone.label)}>
          {scoreLabel(score, threshold)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
