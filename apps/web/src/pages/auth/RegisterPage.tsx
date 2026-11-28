import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Loader2, Lock, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { register as registerApi } from '@/api/auth';
import { AuthFormError, AuthPageHeader } from '@/components/auth/AuthPageHeader';
import { Field, IconInput, PasswordInput } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { toApiError } from '@/lib/apiError';
import { handleFormError } from '@/lib/errorUtils';
import { registerSchema, type RegisterFormValues } from '@/lib/schemas/auth.schema';

export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });
  const mutation = useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      await registerApi({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        role: 'CANDIDATE',
      });
      return values.email;
    },
    onSuccess: (registeredEmail) => {
      toast.success('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
      void navigate('/login', {
        replace: true,
        state: { registeredEmail },
      });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError.status === 409) {
        setError('email', { message: 'Email đã được sử dụng' });
      } else {
        handleFormError(error, setError, ['fullName', 'email', 'password', 'confirmPassword']);
      }
    },
  });

  return (
    <div>
      <AuthPageHeader
        title="Tạo tài khoản ứng viên"
        description="Ứng tuyển nhanh và theo dõi kết quả sàng lọc AI cho từng vị trí."
      />

      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <Field id="fullName" label="Họ và tên" required error={errors.fullName?.message}>
          <IconInput
            id="fullName"
            icon={UserRound}
            autoComplete="name"
            placeholder="Nguyễn Văn A"
            className="h-11"
            aria-invalid={!!errors.fullName}
            {...register('fullName')}
          />
        </Field>
        <Field id="email" label="Email" required error={errors.email?.message}>
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
          required
          hint="Tối thiểu 8 ký tự"
          error={errors.password?.message}
        >
          <PasswordInput
            id="password"
            icon={Lock}
            autoComplete="new-password"
            placeholder="Tạo mật khẩu"
            className="h-11"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
        </Field>
        <Field
          id="confirmPassword"
          label="Nhập lại mật khẩu"
          required
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            icon={LockKeyhole}
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu"
            className="h-11"
            aria-invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </Field>
        <AuthFormError message={errors.root?.server?.message} />
        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
          disabled={isSubmitting || mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Đang tạo tài khoản…
            </>
          ) : (
            <>
              Tạo tài khoản
              <ArrowRight />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
