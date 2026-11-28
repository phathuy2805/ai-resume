import { z } from 'zod';
import type { Company, UpdateCompanyRequest } from '@/types/company';

// Khớp rule BE: apps/api/src/routes/company/company.schema.ts
const text = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} tối đa ${max.toLocaleString('vi-VN')} ký tự`);

export const companyFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên doanh nghiệp')
    .max(200, 'Tên doanh nghiệp tối đa 200 ký tự'),
  shortName: text(100, 'Tên viết tắt'),
  tagline: text(200, 'Khẩu hiệu'),
  industry: text(100, 'Lĩnh vực'),
  companySize: text(50, 'Quy mô'),
  foundedYear: z
    .number({ error: 'Năm thành lập phải là số' })
    .int('Năm thành lập phải là số nguyên')
    .min(1800, 'Năm thành lập không hợp lệ')
    .max(new Date().getFullYear(), 'Năm thành lập không được ở tương lai')
    .nullable(),
  address: text(300, 'Địa chỉ'),
  website: text(500, 'Website').refine((value) => !value || /^https?:\/\/\S+$/i.test(value), {
    message: 'Website phải bắt đầu bằng http:// hoặc https://',
  }),
  contactEmail: text(200, 'Email').refine(
    (value) => !value || z.string().email().safeParse(value).success,
    { message: 'Email liên hệ không hợp lệ' },
  ),
  phone: text(30, 'Số điện thoại'),
  description: text(10000, 'Giới thiệu'),
  culture: text(10000, 'Văn hoá'),
  benefits: z
    .array(z.string().trim().min(1).max(200, 'Mỗi phúc lợi tối đa 200 ký tự'))
    .max(20, 'Tối đa 20 phúc lợi'),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

const NULLABLE_TEXT_FIELDS = [
  'shortName',
  'tagline',
  'industry',
  'companySize',
  'address',
  'website',
  'contactEmail',
  'phone',
  'description',
  'culture',
] as const;

export function toCompanyFormValues(company: Company): CompanyFormValues {
  return {
    name: company.name,
    shortName: company.shortName ?? '',
    tagline: company.tagline ?? '',
    industry: company.industry ?? '',
    companySize: company.companySize ?? '',
    foundedYear: company.foundedYear,
    address: company.address ?? '',
    website: company.website ?? '',
    contactEmail: company.contactEmail ?? '',
    phone: company.phone ?? '',
    description: company.description ?? '',
    culture: company.culture ?? '',
    benefits: company.benefits,
  };
}

/** Chỉ gửi các field đã sửa (PATCH từng phần); chuỗi rỗng ở field tuỳ chọn -> null (xoá giá trị). */
export function toUpdateCompanyRequest(
  values: CompanyFormValues,
  dirty: Partial<Record<keyof CompanyFormValues, unknown>>,
): UpdateCompanyRequest {
  const body: UpdateCompanyRequest = {};
  if (dirty.name) body.name = values.name.trim();
  for (const key of NULLABLE_TEXT_FIELDS) {
    if (dirty[key]) body[key] = values[key].trim() || null;
  }
  if (dirty.foundedYear) body.foundedYear = values.foundedYear;
  if (dirty.benefits) body.benefits = values.benefits;
  return body;
}
