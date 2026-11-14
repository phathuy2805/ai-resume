import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Field, PasswordInput } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type RegisterValues = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>();

  // TODO(W1-FE-03): call register() from '@/api/auth' with role CANDIDATE.
  const onSubmit = (values: RegisterValues) => {
    toast.success(`Đã tạo tài khoản cho ${values.fullName}`);
    navigate('/login');
  };

  return (
    <Card className="p-6 shadow-sm">
      <h1 className="mb-5 text-card-title text-foreground">Tạo tài khoản ứng viên</h1>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field id="fullName" label="Họ và tên" error={errors.fullName?.message}>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder="Nguyễn Văn A"
            aria-invalid={!!errors.fullName}
            {...register('fullName', { required: 'Vui lòng nhập họ và tên' })}
          />
        </Field>
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="ungvien@email.com"
            aria-invalid={!!errors.email}
            {...register('email', {
              required: 'Vui lòng nhập email',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email không hợp lệ' },
            })}
          />
        </Field>
        <Field
          id="password"
          label="Mật khẩu"
          hint="Tối thiểu 8 ký tự"
          error={errors.password?.message}
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register('password', {
              required: 'Vui lòng nhập mật khẩu',
              minLength: { value: 8, message: 'Mật khẩu tối thiểu 8 ký tự' },
            })}
          />
        </Field>
        <Field
          id="confirmPassword"
          label="Nhập lại mật khẩu"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...register('confirmPassword', {
              validate: (value) =>
                value === getValues('password') || 'Mật khẩu nhập lại không khớp',
            })}
          />
        </Field>
        <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
          Đăng ký
        </Button>
      </form>
      <div className="mt-5 flex flex-col items-center gap-2 text-center">
        <p className="text-muted-foreground">
          Đã có tài khoản?{' '}
          <Link to="/login" className="ml-1 font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </Card>
  );
}
