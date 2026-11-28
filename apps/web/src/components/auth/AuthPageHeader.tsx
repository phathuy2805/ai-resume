import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

export function AuthPageHeader({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-page-title text-foreground">{title}</h1>
      <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

/** Lỗi chung của form (không gắn với field cụ thể), ví dụ sai email/mật khẩu. */
export function AuthFormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
