import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1)
    .describe('Số thứ tự trang cần lấy (bắt đầu từ 1)'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe('Số lượng bản ghi trên một trang (tối đa 100)'),
});

export const PaginationMetaSchema = z.object({
  page: z.number().int().describe('Trang hiện tại'),
  limit: z.number().int().describe('Số lượng mục trên mỗi trang'),
  total: z.number().int().describe('Tổng số bản ghi thỏa điều kiện tìm kiếm'),
  totalPages: z.number().int().optional().describe('Tổng số trang'),
});

export type PaginationQueryModel = z.infer<typeof PaginationQuerySchema>;
export type PaginationMetaModel = z.infer<typeof PaginationMetaSchema>;
