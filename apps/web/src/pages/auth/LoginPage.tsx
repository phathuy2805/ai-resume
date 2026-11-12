import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, BrainCircuit, Building2, UserRound, Zap, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type LoginValues = { email: string; password: string; remember: boolean };

export default function LoginPage() {
  const [role, setRole] = useState<"hr" | "candidate">("hr");
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit } = useForm<LoginValues>({ defaultValues: { email: "alexandra@company.com", remember: true } });
  const onSubmit = (values: LoginValues) => toast.success(`Đã xác thực ${values.email}`);
  return <div className="flex flex-col items-center">
    <div className="mb-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm"><BrainCircuit className="h-6 w-6" /></div>
      <div className="flex items-center justify-center gap-2"><h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">RecruitAI</h1><span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">v2.4</span></div>
      <p className="mt-1 text-xs text-slate-400">Autonomous sourcing &amp; candidate intelligence</p>
    </div>
    <Card className="w-full border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-medium">
          <div className="rounded-lg bg-white py-2 text-center text-slate-900 shadow-sm">Đăng nhập</div>
          <Link className="py-2 text-center text-slate-500 hover:text-slate-900" to="/register">Tạo tài khoản</Link>
        </div>
        <div className="mb-5"><h2 className="text-lg font-semibold text-slate-900">Đăng nhập</h2><p className="mt-1 text-xs text-slate-400">Truy cập nền tảng tuyển dụng thông minh RecruitAI</p></div>
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between"><Label>Workspace Persona</Label><span className="flex items-center gap-1 text-xs font-medium text-indigo-600"><Zap className="h-3.5 w-3.5" />AI Copilot</span></div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRole("hr")} className={cn("rounded-xl p-3 text-left transition", role === "hr" ? "bg-indigo-50 text-slate-900 ring-1 ring-indigo-200" : "border bg-white text-slate-500")}><div className="mb-2 flex items-center justify-between"><Building2 className="h-5 w-5 text-indigo-600" /><span className={cn("h-2 w-2 rounded-full", role === "hr" ? "bg-indigo-600" : "bg-transparent")} /></div><div className="text-sm font-semibold">Nhà tuyển dụng (HR)</div><div className="mt-0.5 text-xs text-slate-400">ATS &amp; Tuyển dụng</div></button>
            <button type="button" onClick={() => setRole("candidate")} className={cn("rounded-xl p-3 text-left transition", role === "candidate" ? "bg-indigo-50 text-slate-900 ring-1 ring-indigo-200" : "border bg-white text-slate-500")}><div className="mb-2 flex items-center justify-between"><UserRound className="h-5 w-5" /><span className={cn("h-2 w-2 rounded-full", role === "candidate" ? "bg-indigo-600" : "bg-transparent")} /></div><div className="text-sm font-semibold">Ứng viên</div><div className="mt-0.5 text-xs text-slate-400">Vị trí ứng tuyển</div></button>
          </div>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5"><Label htmlFor="email">Email công việc</Label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" id="email" type="email" placeholder="alexandra@company.com" {...register("email", { required: true })} /></div></div>
          <div className="space-y-1.5"><div className="flex items-center justify-between"><Label htmlFor="password">Mật khẩu</Label><button type="button" className="text-xs font-semibold text-indigo-600">Quên mật khẩu?</button></div><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9 pr-10" id="password" type={showPassword ? "text" : "password"} placeholder="••••••••••••" {...register("password", { required: true })} /><button type="button" aria-label="Hiện mật khẩu" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
          <div className="flex items-center justify-between pt-1"><label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" className="h-4 w-4 accent-indigo-600" {...register("remember")} />Ghi nhớ đăng nhập (30 ngày)</label><span className="flex items-center gap-1 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />Mã hóa</span></div>
          <Button className="h-11 w-full gap-2 bg-indigo-600 hover:bg-indigo-700" type="submit">Đăng nhập <ArrowRight className="h-4 w-4" /></Button>
        </form>
      </CardContent>
    </Card>
    <p className="mt-5 text-xs text-slate-500">Chưa có tài khoản? <Link className="font-semibold text-indigo-600" to="/register">Tạo tài khoản</Link></p>
    <div className="mt-4 flex w-full items-center justify-between rounded-xl bg-white p-3 text-xs shadow-sm"><div className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-indigo-600" /><div><div className="font-medium text-slate-800">Autonomous Talent AI</div><div className="text-slate-400">94.8% candidate match accuracy</div></div></div><span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">Live</span></div>
    <p className="mt-5 text-center text-xs text-slate-400">SOC-2 Type II Certified • 256-bit TLS • GDPR Compliant</p>
  </div>;
}
