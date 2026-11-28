import { useRef, type ChangeEvent } from 'react';
import { ImageUp, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import CompanyLogo from '@/components/common/CompanyLogo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDeleteCompanyLogo, useUploadCompanyLogo } from '@/hooks/useCompany';
import type { Company } from '@/types/company';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

/** Logo được lưu ngay khi chọn file (không chờ nút "Lưu thay đổi" của form). */
export default function CompanyLogoCard({ company }: { company: Company }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadCompanyLogo();
  const remove = useDeleteCompanyLogo();
  const busy = upload.isPending || remove.isPending;
  const displayName = company.shortName || company.name;

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // cho phép chọn lại cùng một file
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Logo chỉ hỗ trợ định dạng JPG, PNG hoặc WebP');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('Logo có dung lượng tối đa 2MB');
      return;
    }
    upload.mutate(file, { onSuccess: () => toast.success('Đã cập nhật logo công ty') });
  };

  const handleRemove = () =>
    remove.mutate(undefined, { onSuccess: () => toast.success('Đã xoá logo công ty') });

  return (
    <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <CompanyLogo
          key={company.logoUrl ?? 'initials'}
          name={displayName}
          logoUrl={company.logoUrl}
          className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-xl text-white shadow-sm ring-1 ring-border"
        />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-card-title text-foreground">Logo công ty</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          PNG, JPG hoặc WebP, tối đa 2MB. Nên dùng ảnh vuông khoảng 256×256px. Logo hiển thị ở trang
          đăng nhập, danh sách việc làm và trang giới thiệu công ty.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            <ImageUp />
            {upload.isPending ? 'Đang tải lên…' : company.logoUrl ? 'Đổi logo' : 'Tải logo lên'}
          </Button>
          {company.logoUrl && (
            <Button size="sm" variant="outline" onClick={handleRemove} disabled={busy}>
              <Trash2 />
              Xoá logo
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        aria-label="Chọn ảnh logo"
        onChange={handleFile}
      />
    </Card>
  );
}
