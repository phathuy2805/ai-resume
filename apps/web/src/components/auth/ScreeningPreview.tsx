import { Briefcase, Check, Mic, Minus } from 'lucide-react';

const SCORE = 88;
const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SKILLS = [
  { name: 'NestJS', matched: true },
  { name: 'TypeScript', matched: true },
  { name: 'PostgreSQL', matched: true },
  { name: 'Docker', matched: false },
];

const WAVE = [6, 12, 18, 10, 22, 14, 8, 16, 20, 9, 13, 6, 11, 17, 7];

/** Minh hoạ trang trí: kết quả AI sàng lọc CV + phỏng vấn giọng nói (dữ liệu mẫu, không tương tác). */
export default function ScreeningPreview() {
  return (
    <div aria-hidden="true" className="relative w-full max-w-[440px] select-none pb-12 pr-6">
      {/* Thẻ kết quả sàng lọc (pb-12 chừa chỗ cho thẻ phỏng vấn nổi đè lên góc dưới) */}
      <div className="relative rounded-2xl bg-white p-5 pb-12 shadow-2xl shadow-indigo-950/30 ring-1 ring-white/60">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100">
            <Briefcase className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              Backend NestJS Developer
            </p>
            <p className="text-xs text-slate-500">AI đánh giá CV · vừa xong</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            Phù hợp cao
          </span>
        </div>

        <div className="mt-5 flex items-center gap-5">
          <div className="relative h-[84px] w-[84px] shrink-0">
            <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
              <defs>
                <linearGradient id="score-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <circle
                cx="42"
                cy="42"
                r={RADIUS}
                fill="none"
                strokeWidth="7"
                className="stroke-slate-100"
              />
              <circle
                cx="42"
                cy="42"
                r={RADIUS}
                fill="none"
                strokeWidth="7"
                strokeLinecap="round"
                stroke="url(#score-ring)"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - SCORE / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span className="text-2xl font-semibold text-slate-900">{SCORE}</span>
              <span className="mt-0.5 text-[10px] text-slate-400">/100</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Kỹ năng khớp với JD</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {SKILLS.map(({ name, matched }) => (
                <li
                  key={name}
                  className={
                    matched
                      ? 'inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700'
                      : 'inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-400 line-through decoration-slate-300'
                  }
                >
                  {matched ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Thẻ phỏng vấn giọng nói */}
      <div className="absolute bottom-0 right-0 w-52 rounded-xl bg-slate-900 p-3 text-white shadow-2xl shadow-indigo-950/40 ring-1 ring-inset ring-white/10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500">
            <Mic className="h-3.5 w-3.5" />
          </span>
          <div className="leading-tight">
            <p className="text-xs font-semibold">Phỏng vấn AI</p>
            <p className="text-[11px] text-slate-400">Câu 2/3 · đang ghi âm</p>
          </div>
        </div>
        <div className="mt-3 flex h-6 items-center gap-[3px]">
          {WAVE.map((height, index) => (
            <span key={index} className="w-1 rounded-full bg-indigo-400" style={{ height }} />
          ))}
        </div>
      </div>
    </div>
  );
}
