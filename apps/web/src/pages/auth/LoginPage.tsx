import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Field, PasswordInput } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { mockUser } from '@/lib/mockUser';

type LoginValues = { email: string; password: string };

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>();

  // TODO(W1-FE-03): call login() from '@/api/auth' and redirect by the returned role.
  const onSubmit = (values: LoginValues) => {
    toast.success(`Đăng nhập với ${values.email}`);
    navigate(mockUser.role === 'HR' ? '/hr/jobs' : '/candidate/jobs');
  };

  return (
    <Card className="p-6 shadow-sm">
      <h1 className="mb-5 text-card-title text-foreground">Đăng nhập</h1>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
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
