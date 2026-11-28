import type { Company } from '@/types/company';

/** Tên ngắn ưu tiên hiển thị (shortName), không có thì dùng tên đầy đủ. */
export function companyDisplayName(company: Pick<Company, 'name' | 'shortName'>): string {
  return company.shortName || company.name;
}

/** "Tầng 12, ..., TP. Hồ Chí Minh" -> "TP. Hồ Chí Minh" */
export function companyCity(address: string | null): string | null {
  if (!address) return null;
  return address.split(',').at(-1)?.trim() || null;
}

/** "https://www.lumora.example/" -> "lumora.example" (để hiển thị gọn). */
export function prettyWebsite(url: string): string {
  return url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
}
