import { z } from 'zod';
import { CompanySchema } from '../../shared/models/company.model.js';

/** Chuỗi tuỳ chọn: trim, chuỗi rỗng được lưu thành null (xoá giá trị). */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} tối đa ${max.toLocaleString('vi-VN')} ký tự`)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable();

const optionalUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(500, `${label} tối đa 500 ký tự`)
    .refine((value) => value.length === 0 || /^https?:\/\/\S+$/i.test(value), {
      message: `${label} phải là URL bắt đầu bằng http:// hoặc https://`,
    })
    .transform((value) => (value.length === 0 ? null : value))
    .nullable();

const BenefitItemSchema = z
  .string()
  .trim()
  .min(1, 'Phúc lợi không được để trống')
  .max(200, 'Mỗi phúc lợi tối đa 200 ký tự');

// ==================== Request Schemas ====================

export const UpdateCompanyBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Tên doanh nghiệp không được để trống')
      .max(200, 'Tên doanh nghiệp tối đa 200 ký tự')
      .describe('Tên đầy đủ của doanh nghiệp'),
    shortName: optionalText(100, 'Tên viết tắt').describe('Tên viết tắt / thương hiệu'),
    tagline: optionalText(200, 'Khẩu hiệu').describe('Khẩu hiệu ngắn'),
    logoUrl: optionalUrl('URL logo').describe('URL logo doanh nghiệp'),
    industry: optionalText(100, 'Lĩnh vực').describe('Lĩnh vực hoạt động'),
    companySize: optionalText(50, 'Quy mô').describe('Quy mô nhân sự'),
    foundedYear: z
      .number()
      .int('Năm thành lập phải là số nguyên')
      .min(1800, 'Năm thành lập không hợp lệ')
      .max(new Date().getFullYear(), 'Năm thành lập không được ở tương lai')
      .nullable()
      .describe('Năm thành lập'),
    address: optionalText(300, 'Địa chỉ').describe('Địa chỉ trụ sở'),
    website: optionalUrl('Website').describe('Website doanh nghiệp'),
    contactEmail: z
      .string()
      .trim()
      .toLowerCase()
      .max(200, 'Email tối đa 200 ký tự')
      .refine((value) => value.length === 0 || z.email().safeParse(value).success, {
        message: 'Email liên hệ không đúng định dạng',
      })
      .transform((value) => (value.length === 0 ? null : value))
      .nullable()
      .describe('Email liên hệ tuyển dụng'),
    phone: optionalText(30, 'Số điện thoại').describe('Số điện thoại liên hệ'),
    description: optionalText(10000, 'Giới thiệu').describe('Giới thiệu doanh nghiệp'),
    culture: optionalText(10000, 'Văn hoá').describe('Văn hoá và giá trị cốt lõi'),
    benefits: z
      .array(BenefitItemSchema)
      .max(20, 'Tối đa 20 phúc lợi')
      .describe('Danh sách phúc lợi'),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Cần cung cấp ít nhất một trường để cập nhật',
  });

// ==================== Response Schemas ====================

export const GetCompanyResSchema = CompanySchema;
export const UpdateCompanyResSchema = CompanySchema;

// ==================== Inferred Types ====================

export type UpdateCompanyBodyType = z.infer<typeof UpdateCompanyBodySchema>;
export type GetCompanyResType = z.infer<typeof GetCompanyResSchema>;
export type UpdateCompanyResType = z.infer<typeof UpdateCompanyResSchema>;
