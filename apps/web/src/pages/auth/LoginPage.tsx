import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginValues = { email: string; password: string };

export default function LoginPage() {
  const { register, handleSubmit } = useForm<LoginValues>();
  const onSubmit = (values: LoginValues) => { toast.success(`Đăng nhập với ${values.email}`); };
  return <main className="container flex min-h-screen items-center justify-center py-10"><Card className="w-full max-w-md"><CardHeader><CardTitle>Đăng nhập hệ thống tuyển dụng AI</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={handleSubmit(onSubmit)}><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" {...register("email", { required: true })} /></div><div className="space-y-2"><Label htmlFor="password">Mật khẩu</Label><Input id="password" type="password" {...register("password", { required: true })} /></div><Button type="submit">Đăng nhập</Button></form></CardContent></Card></main>;
}
