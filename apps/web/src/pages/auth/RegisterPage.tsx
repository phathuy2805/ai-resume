import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { register as registerApi } from '@/api/auth';
import { Field, PasswordInput } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { handleFormError } from '@/lib/errorUtils';
import { registerSchema, type RegisterFormValues } from '@/lib/schemas/auth.schema';
import { toApiError } from '@/lib/apiError';

export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'CANDIDATE' },
  });
  const role = useWatch({ control, name: 'role' });
  const mutation = useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      await registerApi({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        role: values.role,
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
        handleFormError(error, setError, [
          'fullName',
          'email',
          'password',
          'confirmPassword',
          'role',
        ]);
      }
    },
  });

  return (
    <Card className="p-6 shadow-sm">
      <h1 className="mb-5 text-card-title text-foreground">Tạo tài khoản</h1>
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <Field id="fullName" label="Họ và tên" error={errors.fullName?.message}>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder="Nguyễn Văn A"
            aria-invalid={!!errors.fullName}
            {...register('fullName')}
          />
        </Field>
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="ungvien@email.com"
            aria-invalid={!!errors.email}
            {...register('email')}
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
            {...register('password')}
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
            {...register('confirmPassword')}
          />
        </Field>
        <Field id="role" label="Vai trò" error={errors.role?.message}>
          <RadioGroup
            value={role}
            onValueChange={(value) =>
              setValue('role', value as RegisterFormValues['role'], { shouldValidate: true })
            }
            className="grid-cols-2"
          >
            <label
              htmlFor="role-candidate"
              className="flex cursor-pointer items-center gap-2 rounded-lg border p-3"
            >
              <RadioGroupItem id="role-candidate" value="CANDIDATE" />
              <span>Ứng viên</span>
            </label>
            <label
              htmlFor="role-hr"
              className="flex cursor-pointer items-center gap-2 rounded-lg border p-3"
            >
              <RadioGroupItem id="role-hr" value="HR" />
              <span>Nhà tuyển dụng (HR)</span>
            </label>
          </RadioGroup>
          <input type="hidden" {...register('role')} />
        </Field>
        {errors.root?.server?.message && (
          <p role="alert" className="text-sm text-destructive">
            {errors.root.server.message}
          </p>
        )}
        <Button type="submit" className="mt-1 w-full" disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? 'Đang tạo tài khoản…' : 'Đăng ký'}
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
