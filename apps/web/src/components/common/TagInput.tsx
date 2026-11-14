import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Chip input: Enter or comma adds a tag, Backspace on empty input removes the last one. */
export default function TagInput({
  id,
  value,
  onChange,
  placeholder = '+ Thêm kỹ năng...',
  tone = 'default',
  invalid,
}: {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  tone?: 'default' | 'soft';
  invalid?: boolean;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const tag = draft.trim().replace(/,$/, '');
    if (tag && !value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      onChange([...value, tag]);
    }
    setDraft('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add();
    } else if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        'flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card p-1.5 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary',
        invalid && 'border-destructive',
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-foreground',
            tone === 'default' ? 'bg-indigo-50' : 'bg-slate-100',
          )}
        >
          {tag}
          <button
            type="button"
            aria-label={`Xoá ${tag}`}
            onClick={() => onChange(value.filter((item) => item !== tag))}
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={add}
        placeholder={placeholder}
        className="h-7 min-w-28 flex-1 bg-transparent px-1 text-sm text-foreground outline-none placeholder:text-slate-400"
      />
    </div>
  );
}
