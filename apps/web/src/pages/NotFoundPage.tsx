import { Link } from 'react-router-dom';
import Logo from '@/components/common/Logo';
import { buttonVariants } from '@/components/ui/button-variants';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <Logo size="lg" />
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-page-title text-foreground">Không tìm thấy trang</h1>
      <p className="max-w-sm text-muted-foreground">
        Đường dẫn không tồn tại hoặc đã được thay đổi.
      </p>
      <Link to="/login" className={buttonVariants({ className: 'mt-2' })}>
        Về trang đăng nhập
      </Link>
    </main>
  );
}
