import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Company as PrismaCompany } from '../../generated/prisma/client.js';
import type { CompanyRepository } from './company.repository.js';
import { UpdateCompanyBodySchema } from './company.schema.js';
import { CompanyService } from './company.service.js';

const COMPANY_ID = '33333333-3333-4333-8333-333333333333';

function prismaCompany(overrides: Partial<PrismaCompany> = {}): PrismaCompany {
  const now = new Date('2026-11-28T03:00:00.000Z');
  return {
    id: COMPANY_ID,
    singleton: true,
    name: 'Công ty Cổ phần Công nghệ Lumora',
    shortName: 'Lumora Tech',
    tagline: null,
    logoUrl: null,
    industry: 'Phần mềm',
    companySize: '200-500 nhân viên',
    foundedYear: 2016,
    address: null,
    website: 'https://lumora.example',
    contactEmail: 'tuyendung@lumora.example',
    phone: null,
    description: 'Giới thiệu',
    culture: null,
    benefits: ['Lương tháng 13'],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('CompanyService', () => {
  let repo: {
    findCompany: ReturnType<typeof vi.fn>;
    updateCompany: ReturnType<typeof vi.fn>;
  };
  let service: CompanyService;

  beforeEach(() => {
    repo = { findCompany: vi.fn(), updateCompany: vi.fn() };
    service = new CompanyService(repo as unknown as CompanyRepository);
  });

  describe('getCompany', () => {
    it('trả về thông tin doanh nghiệp, không lộ cột singleton', async () => {
      repo.findCompany.mockResolvedValue(prismaCompany());

      const result = await service.getCompany();

      expect(result).toMatchObject({
        id: COMPANY_ID,
        name: 'Công ty Cổ phần Công nghệ Lumora',
        benefits: ['Lương tháng 13'],
        createdAt: '2026-11-28T03:00:00.000Z',
      });
      expect(result).not.toHaveProperty('singleton');
    });

    it('ném 404 khi chưa seed doanh nghiệp', async () => {
      repo.findCompany.mockResolvedValue(null);

      await expect(service.getCompany()).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateCompany', () => {
    it('chỉ gửi các trường được cung cấp và chuẩn hoá danh sách phúc lợi', async () => {
      repo.updateCompany.mockResolvedValue(prismaCompany({ tagline: 'Mới' }));

      await service.updateCompany({
        tagline: 'Mới',
        benefits: ['Lương tháng 13', ' lương tháng 13 ', 'Hybrid'],
      });

      expect(repo.updateCompany).toHaveBeenCalledWith({
        tagline: 'Mới',
        benefits: ['Lương tháng 13', 'Hybrid'],
      });
    });

    it('không đụng tới benefits khi body không có trường này', async () => {
      repo.updateCompany.mockResolvedValue(prismaCompany());

      await service.updateCompany({ name: 'Tên mới' });

      expect(repo.updateCompany).toHaveBeenCalledWith({ name: 'Tên mới' });
    });

    it('ném 404 khi chưa có dòng company để cập nhật', async () => {
      repo.updateCompany.mockResolvedValue(null);

      await expect(service.updateCompany({ name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

describe('UpdateCompanyBodySchema', () => {
  it('chuyển chuỗi rỗng thành null để xoá giá trị', () => {
    const result = UpdateCompanyBodySchema.parse({ tagline: '   ', website: '' });
    expect(result).toEqual({ tagline: null, website: null });
  });

  it('chấp nhận email liên hệ hợp lệ và chuẩn hoá chữ thường', () => {
    const result = UpdateCompanyBodySchema.parse({ contactEmail: ' HR@Lumora.Example ' });
    expect(result).toEqual({ contactEmail: 'hr@lumora.example' });
  });

  it.each<[string, unknown]>([
    ['body rỗng', {}],
    ['tên rỗng', { name: '  ' }],
    ['website thiếu http(s)', { website: 'lumora.example' }],
    ['email sai định dạng', { contactEmail: 'not-an-email' }],
    ['năm thành lập ở tương lai', { foundedYear: 3000 }],
    ['quá 20 phúc lợi', { benefits: Array.from({ length: 21 }, (_, i) => `B${i}`) }],
    ['trường lạ', { singleton: false }],
  ])('từ chối body: %s', (_label, body) => {
    expect(UpdateCompanyBodySchema.safeParse(body).success).toBe(false);
  });
});
