import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Field, PasswordInput } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { login } from '@/api/auth';
import { handleFormError } from '@/lib/errorUtils';
import { safeCandidateReturnTo } from '@/lib/loginRedirect';

type LoginValues = { email: string; password: string };

export default function LoginPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>();

  // Minimal FE-04 bridge for the candidate apply flow; no mock identity.
  const onSubmit = async (values: LoginValues) => {
    try {
      const result = await login(values);
      toast.success('Đăng nhập thành công.');
      const target =
        result.user.role === 'CANDIDATE'
          ? (safeCandidateReturnTo(search.get('returnTo')) ?? '/candidate/jobs')
          : '/hr/jobs';
      navigate(target, { replace: true });
    } catch (error) {
      handleFormError<LoginValues>(error, setError, ['email', 'password']);
    }
  };

  return (
    <Card className="p-6 shadow-sm">
      <h1 className="mb-5 text-card-title text-foreground">Đăng nhập</h1>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {errors.root?.server?.message && (
          <p role="alert" className="text-red-700">
            {errors.root.server.message}
          </p>
        )}
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
        <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
          Đăng nhập
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
