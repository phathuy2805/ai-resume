import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { login as loginApi } from '@/api/auth';
import { AuthFormError, AuthPageHeader } from '@/components/auth/AuthPageHeader';
import { Field, IconInput, PasswordInput } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { toApiError } from '@/lib/apiError';
import { handleFormError } from '@/lib/errorUtils';
import { safeCandidateReturnTo } from '@/lib/loginRedirect';
import { loginSchema, type LoginFormValues } from '@/lib/schemas/auth.schema';
import { roleHome, useAuth } from '@/providers/auth-context';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();
  const { login } = useAuth();
  const registeredEmail =
    typeof location.state?.registeredEmail === 'string' ? location.state.registeredEmail : '';
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: registeredEmail },
  });
  const mutation = useMutation({
    mutationFn: loginApi,
    onSuccess: ({ user: nextUser, accessToken }) => {
      login(nextUser, accessToken);
      const from = location.state?.from;
      const candidateReturn =
        nextUser.role === 'CANDIDATE' ? safeCandidateReturnTo(search.get('returnTo')) : null;
      const destination =
        candidateReturn ??
        (from &&
        typeof from.pathname === 'string' &&
        from.pathname !== '/login' &&
        ((nextUser.role === 'HR' && from.pathname.startsWith('/hr')) ||
          (nextUser.role === 'CANDIDATE' && from.pathname.startsWith('/candidate')))
          ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
          : roleHome(nextUser.role));
      toast.success('Đăng nhập thành công');
      void navigate(destination, { replace: true });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError.status === 401) {
        setError('root.server', { message: 'Email hoặc mật khẩu không đúng' });
      } else {
        handleFormError(error, setError, ['email', 'password']);
      }
    },
  });
  const pending = isSubmitting || mutation.isPending;

  return (
    <div>
      <AuthPageHeader
        title="Chào mừng trở lại"
        description="Đăng nhập để theo dõi hồ sơ ứng tuyển hoặc quản lý tuyển dụng."
      />

      {registeredEmail && (
        <p className="mb-5 rounded-lg bg-primary/5 px-3 py-2.5 text-sm text-primary ring-1 ring-inset ring-primary/20">
          Tài khoản đã được tạo. Hãy đăng nhập để bắt đầu ứng tuyển.
        </p>
      )}

      <form
        className="flex flex-col gap-5"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <Field id="email" label="Email" error={errors.email?.message}>
          <IconInput
            id="email"
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="ten@email.com"
            className="h-11"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
        </Field>
        <Field
          id="password"
          label="Mật khẩu"
          error={errors.password?.message}
          aside={
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Quên mật khẩu?
            </Link>
          }
        >
          <PasswordInput
            id="password"
            icon={Lock}
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            className="h-11"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
        </Field>
        <AuthFormError message={errors.root?.server?.message} />
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Đang đăng nhập…
            </>
          ) : (
            <>
              Đăng nhập
              <ArrowRight />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Đăng ký ứng viên
        </Link>
      </p>
    </div>
  );
}
