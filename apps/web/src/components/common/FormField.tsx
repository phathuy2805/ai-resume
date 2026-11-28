import { useState, type ComponentType, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type IconType = ComponentType<{ className?: string }>;

/** Label above, control, then either an error or a helper line. */
export function Field({
  id,
  label,
  error,
  hint,
  aside,
  required,
  children,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: string;
  aside?: ReactNode;
  /** Hiển thị dấu * sau label (chỉ để trang trí, validate vẫn do schema). */
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-destructive">
              *
            </span>
          )}
        </Label>
        {aside}
      </div>
      {children}
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function LeadingIcon({ icon: Icon }: { icon: IconType }) {
  return (
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
  );
}

/** Input có icon phía trước. */
export function IconInput({
  icon,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon: IconType }) {
  return (
    <div className="group relative">
      <LeadingIcon icon={icon} />
      <Input {...props} className={cn('pl-10', className)} />
    </div>
  );
}

export function PasswordInput({
  icon,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { icon?: IconType }) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="group relative">
      {icon && <LeadingIcon icon={icon} />}
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn('pr-10', icon && 'pl-10', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}
