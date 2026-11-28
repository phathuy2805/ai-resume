import { z } from 'zod';

export const CompanySchema = z.object({
  id: z.uuid().describe('Mã định danh doanh nghiệp (UUID)'),
  name: z.string().min(1).describe('Tên đầy đủ của doanh nghiệp'),
  shortName: z.string().nullable().describe('Tên viết tắt / thương hiệu'),
  tagline: z.string().nullable().describe('Khẩu hiệu ngắn'),
  logoUrl: z
    .string()
    .nullable()
    .describe(
      'Đường dẫn ảnh logo (/api/company/logo?v=...), null nếu chưa có. Logo được thay qua POST /company/logo',
    ),
  industry: z.string().nullable().describe('Lĩnh vực hoạt động'),
  companySize: z.string().nullable().describe('Quy mô nhân sự (vd: "200-500 nhân viên")'),
  foundedYear: z.number().int().nullable().describe('Năm thành lập'),
  address: z.string().nullable().describe('Địa chỉ trụ sở'),
  website: z.string().nullable().describe('Website doanh nghiệp'),
  contactEmail: z.string().nullable().describe('Email liên hệ tuyển dụng'),
  phone: z.string().nullable().describe('Số điện thoại liên hệ'),
  description: z.string().nullable().describe('Giới thiệu doanh nghiệp'),
  culture: z.string().nullable().describe('Văn hoá và giá trị cốt lõi'),
  benefits: z.array(z.string()).describe('Danh sách phúc lợi'),
  createdAt: z.string().describe('Thời điểm tạo (ISO 8601)'),
  updatedAt: z.string().describe('Thời điểm cập nhật gần nhất (ISO 8601)'),
});

export type CompanyModel = z.infer<typeof CompanySchema>;
