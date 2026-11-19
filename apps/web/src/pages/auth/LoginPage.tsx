import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { login as loginApi } from '@/api/auth';
import { Field, PasswordInput } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { handleFormError } from '@/lib/errorUtils';
import { loginSchema, type LoginFormValues } from '@/lib/schemas/auth.schema';
import { roleHome } from '@/providers/auth-context';
import { useAuth } from '@/providers/auth-context';
import { toApiError } from '@/lib/apiError';
import { safeCandidateReturnTo } from '@/lib/loginRedirect';

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

  return (
    <Card className="p-6 shadow-sm">
      <h1 className="mb-5 text-card-title text-foreground">Đăng nhập</h1>
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            aria-invalid={!!errors.email}
            {...register('email', {
              required: 'Vui lòng nhập email',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email không hợp lệ' },
            })}
          />
        </Field>
        <Field id="password" label="Mật khẩu" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register('password', { required: 'Vui lòng nhập mật khẩu' })}
          />
        </Field>
        {errors.root?.server?.message && (
          <p role="alert" className="text-sm text-destructive">
            {errors.root.server.message}
          </p>
        )}
        <Button type="submit" className="mt-1 w-full" disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </form>
      <p className="mt-5 text-center text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="ml-1 font-medium text-primary hover:underline">
          Đăng ký
        </Link>
      </p>
    </Card>
  );
}
