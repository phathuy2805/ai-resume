import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type RegisterValues = { name: string; email: string; password: string; terms: boolean };

export default function RegisterPage() {
  const [role, setRole] = useState<'hr' | 'candidate'>('hr');
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit } = useForm<RegisterValues>({ defaultValues: { terms: true } });
  return (
    <div className="flex flex-col items-center">
      <Card className="w-full border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-5 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <BrainCircuit className="h-5 w-5" />
              </span>
              <span className="text-lg font-semibold text-slate-900">RecruitAI</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                v2.4
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Tạo tài khoản</h1>
            <p className="mt-1 text-xs text-slate-400">
              Bắt đầu tìm kiếm và quản lý nhân tài với RecruitAI
            </p>
          </div>
          <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm">
            <Link className="py-1.5 text-center text-slate-500" to="/login">
              Đăng nhập
            </Link>
            <div className="rounded bg-white py-1.5 text-center font-semibold text-slate-900 shadow-sm">
              Tạo tài khoản
            </div>
          </div>
          <div className="mb-5">
            <Label className="mb-2 block">Mục đích sử dụng</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('hr')}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold',
                  role === 'hr'
                    ? 'bg-indigo-50 text-slate-900 ring-2 ring-indigo-100'
                    : 'border bg-white text-slate-500',
                )}
              >
                <span
                  className={cn(
                    'mr-2 inline-block h-2 w-2 rounded-full',
                    role === 'hr' ? 'bg-indigo-600' : 'bg-slate-200',
                  )}
                />
                Nhà tuyển dụng (HR)
              </button>
              <button
                type="button"
                onClick={() => setRole('candidate')}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm',
                  role === 'candidate'
                    ? 'bg-indigo-50 font-semibold text-slate-900 ring-2 ring-indigo-100'
                    : 'border bg-white text-slate-500',
                )}
              >
                <span
                  className={cn(
                    'mr-2 inline-block h-2 w-2 rounded-full',
                    role === 'candidate' ? 'bg-indigo-600' : 'bg-slate-200',
                  )}
                />
                Ứng viên
              </button>
            </div>
          </div>
          <form
            className="space-y-3.5"
            onSubmit={handleSubmit(() => toast.success('Tài khoản đã được tạo'))}
          >
            <div className="space-y-1">
              <Label htmlFor="name">Họ và tên</Label>
              <Input
                className="bg-slate-50"
                id="name"
                placeholder="Nguyễn Văn A"
                {...register('name', { required: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="register-email">Email công việc</Label>
              <Input
                className="bg-slate-50"
                id="register-email"
                type="email"
                placeholder="alexandra@company.com"
                {...register('email', { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label htmlFor="register-password">Mật khẩu</Label>
                <span className="text-xs font-semibold text-emerald-700">Mạnh</span>
              </div>
              <div className="relative">
                <Input
                  className="bg-slate-50 pr-10"
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tối thiểu 8 ký tự"
                  {...register('password', { required: true, minLength: 8 })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="h-1 rounded-full bg-emerald-600" />
                <span className="h-1 rounded-full bg-emerald-600" />
                <span className="h-1 rounded-full bg-emerald-600" />
              </div>
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-indigo-600"
                {...register('terms', { required: true })}
              />
              Tôi đồng ý với{' '}
              <a className="text-indigo-600" href="#terms">
                Điều khoản dịch vụ
              </a>{' '}
              và{' '}
              <a className="text-indigo-600" href="#privacy">
                Chính sách bảo mật
              </a>
              .
            </label>
            <Button className="h-11 w-full gap-2 bg-indigo-600 hover:bg-indigo-700" type="submit">
              Tạo tài khoản <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <div className="mt-5 text-center">
            <p className="text-xs text-slate-500">
              Đã có tài khoản?{' '}
              <Link className="font-semibold text-indigo-600" to="/login">
                Đăng nhập
              </Link>
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Được tin dùng bởi hơn 1.200+ nhóm nhân tài
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
