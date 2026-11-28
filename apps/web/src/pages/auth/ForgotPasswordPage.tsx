import { useEffect, useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, KeyRound, Loader2, Mail, MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthPageHeader } from '@/components/auth/AuthPageHeader';
import { Field, IconInput } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/schemas/auth.schema';

/** Mô phỏng độ trễ mạng; thay bằng API thật khi BE có endpoint quên mật khẩu. */
const SIMULATED_DELAY_MS = 800;
const RESEND_COOLDOWN_S = 30;

const NEXT_STEPS = [
  'Mở email đặt lại mật khẩu trong hộp thư',
  'Nhấn vào liên kết trong email',
  'Tạo mật khẩu mới và đăng nhập lại',
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function IconBadge({ tone, children }: { tone: 'primary' | 'success'; children: ReactNode }) {
  return (
    <span
      className={
        tone === 'primary'
          ? 'mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20'
          : 'mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10'
      }
    >
      {children}
    </span>
  );
}

function BackToLogin() {
  return (
    <Link
      to="/login"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Quay lại đăng nhập
    </Link>
  );
}

/**
 * Giao diện quên mật khẩu (chưa nối API).
 * TODO: gọi POST /auth/forgot-password khi BE hỗ trợ. Luôn hiển thị cùng một thông báo
 * thành công dù email có tồn tại hay không, để tránh lộ danh sách tài khoản.
 */
export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onSubmit = async ({ email }: ForgotPasswordFormValues) => {
    await wait(SIMULATED_DELAY_MS);
    setSentTo(email);
    setCooldown(RESEND_COOLDOWN_S);
  };

  const resend = async () => {
    setResending(true);
    await wait(SIMULATED_DELAY_MS);
    setResending(false);
    setCooldown(RESEND_COOLDOWN_S);
    toast.success('Đã gửi lại email đặt lại mật khẩu');
  };

  if (sentTo) {
    return (
      <div>
        <IconBadge tone="success">
          <MailCheck className="h-6 w-6" />
        </IconBadge>
        <AuthPageHeader
          title="Kiểm tra hộp thư của bạn"
          description={
            <>
              Nếu <span className="font-medium text-foreground">{sentTo}</span> đã được đăng ký, bạn
              sẽ nhận được email hướng dẫn đặt lại mật khẩu trong vài phút.
            </>
          }
        />

        <ol className="mb-8 space-y-3 rounded-xl border border-border bg-secondary/50 p-4">
          {NEXT_STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-3 text-sm text-foreground">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <Link to="/login" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
          Quay lại đăng nhập
        </Link>

        <p className="mt-6 text-center text-muted-foreground">
          Không nhận được email? Kiểm tra thư mục Spam hoặc{' '}
          {cooldown > 0 ? (
            <span className="font-medium text-slate-400">gửi lại sau {cooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={() => void resend()}
              disabled={resending}
              className="font-medium text-primary hover:underline disabled:opacity-50"
            >
              {resending ? 'đang gửi…' : 'gửi lại'}
            </button>
          )}
        </p>
      </div>
    );
  }

  return (
    <div>
      <IconBadge tone="primary">
        <KeyRound className="h-6 w-6" />
      </IconBadge>
      <AuthPageHeader
        title="Quên mật khẩu?"
        description="Đừng lo, nhập email đã đăng ký và chúng tôi sẽ gửi cho bạn liên kết để đặt lại mật khẩu."
      />
      <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field id="email" label="Email" error={errors.email?.message}>
          <IconInput
            id="email"
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="ten@email.com"
            className="h-11"
            autoFocus
            aria-invalid={!!errors.email}
            {...register('email')}
          />
        </Field>
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              Đang gửi…
            </>
          ) : (
            <>
              Gửi liên kết đặt lại
              <ArrowRight />
            </>
          )}
        </Button>
      </form>
      <div className="mt-8 text-center">
        <BackToLogin />
      </div>
    </div>
  );
}
