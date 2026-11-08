import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function NotFoundPage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404 - Không tìm thấy trang</h1>
      <Link
        className={cn(
          'inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90',
        )}
        to="/login"
      >
        Về trang đăng nhập
      </Link>
    </main>
  );
}
