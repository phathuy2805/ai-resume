import { useEffect } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { companyDisplayName } from '@/lib/company';

const DEFAULT_TITLE = 'Cổng tuyển dụng';
const DEFAULT_FAVICON = { href: '/favicon.svg', type: 'image/svg+xml' };

function faviconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  return link;
}

/**
 * Đồng bộ tiêu đề tab và favicon theo doanh nghiệp: "Lumora Tech – Cổng tuyển dụng" + logo công ty.
 * Chưa có dữ liệu / lỗi thì giữ mặc định. Không render gì.
 */
export default function DocumentBranding() {
  const { data: company } = useCompany();
  const name = company ? companyDisplayName(company) : null;
  const logoUrl = company?.logoUrl ?? null;

  useEffect(() => {
    document.title = name ? `${name} – ${DEFAULT_TITLE}` : DEFAULT_TITLE;
  }, [name]);

  useEffect(() => {
    const link = faviconLink();
    if (logoUrl) {
      link.href = logoUrl;
      link.removeAttribute('type'); // ảnh PNG/JPG/WebP tuỳ file HR tải lên
    } else {
      link.href = DEFAULT_FAVICON.href;
      link.type = DEFAULT_FAVICON.type;
    }
  }, [logoUrl]);

  return null;
}
