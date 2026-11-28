import { useState } from 'react';
import { cn } from '@/lib/utils';

function companyInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || '?'
  );
}

/** Logo doanh nghiệp; khi chưa có (hoặc lỗi tải) logoUrl thì hiển thị chữ cái đầu. */
export default function CompanyLogo({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const base = cn(
    'flex shrink-0 items-center justify-center overflow-hidden rounded-xl font-semibold',
    className,
  );
  if (logoUrl && !failed) {
    return (
      <span className={base}>
        <img
          src={logoUrl}
          alt={`Logo ${name}`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }
  return (
    <span className={base} aria-hidden="true">
      {companyInitials(name)}
    </span>
  );
}
