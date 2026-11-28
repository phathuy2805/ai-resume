import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Company as PrismaCompany } from '../../generated/prisma/client.js';
import type { StorageService } from '../../shared/services/storage.service.js';
import { COMPANY_LOGO_SIGNED_URL_EXPIRES_SEC } from './company.constant.js';
import type { CompanyRepository } from './company.repository.js';
import { UpdateCompanyBodySchema } from './company.schema.js';
import { CompanyService } from './company.service.js';

const COMPANY_ID = '33333333-3333-4333-8333-333333333333';
const UPDATED_AT = new Date('2026-11-28T03:00:00.000Z');
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);

function prismaCompany(overrides: Partial<PrismaCompany> = {}): PrismaCompany {
  return {
    id: COMPANY_ID,
    singleton: true,
    name: 'Công ty Cổ phần Công nghệ Lumora',
    shortName: 'Lumora Tech',
    tagline: null,
    logoS3Key: null,
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
    createdAt: UPDATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

function multerFile(buffer: Buffer): Express.Multer.File {
  return { buffer, size: buffer.length } as Express.Multer.File;
}

describe('CompanyService', () => {
  let repo: {
    findCompany: ReturnType<typeof vi.fn>;
    updateCompany: ReturnType<typeof vi.fn>;
    updateLogoKey: ReturnType<typeof vi.fn>;
  };
  let storage: {
    putObject: ReturnType<typeof vi.fn>;
    deleteObject: ReturnType<typeof vi.fn>;
    getSignedUrl: ReturnType<typeof vi.fn>;
  };
  let service: CompanyService;

  beforeEach(() => {
    repo = { findCompany: vi.fn(), updateCompany: vi.fn(), updateLogoKey: vi.fn() };
    storage = {
      putObject: vi.fn().mockResolvedValue(undefined),
      deleteObject: vi.fn().mockResolvedValue(undefined),
      getSignedUrl: vi.fn(),
    };
    service = new CompanyService(
      repo as unknown as CompanyRepository,
      storage as unknown as StorageService,
    );
  });

  describe('getCompany', () => {
    it('trả về thông tin doanh nghiệp, không lộ singleton hay logoS3Key', async () => {
      repo.findCompany.mockResolvedValue(prismaCompany());

      const result = await service.getCompany();

      expect(result).toMatchObject({
        id: COMPANY_ID,
        name: 'Công ty Cổ phần Công nghệ Lumora',
        logoUrl: null,
        benefits: ['Lương tháng 13'],
        createdAt: '2026-11-28T03:00:00.000Z',
      });
      expect(result).not.toHaveProperty('singleton');
      expect(result).not.toHaveProperty('logoS3Key');
    });

    it('logoUrl là đường dẫn công khai kèm phiên bản khi đã có logo', async () => {
      repo.findCompany.mockResolvedValue(prismaCompany({ logoS3Key: 'company/logo/a.png' }));

      const result = await service.getCompany();

      expect(result.logoUrl).toBe(`/api/company/logo?v=${UPDATED_AT.getTime()}`);
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

  describe('uploadLogo', () => {
    it('tải lên S3 với key company/logo/<uuid>.png, lưu key rồi xoá logo cũ', async () => {
      repo.findCompany.mockResolvedValue(prismaCompany({ logoS3Key: 'company/logo/old.jpg' }));
      repo.updateLogoKey.mockImplementation(async (key: string) =>
        prismaCompany({ logoS3Key: key }),
      );

      const result = await service.uploadLogo(multerFile(PNG_BYTES));

      const [key, body, mime] = storage.putObject.mock.calls[0];
      expect(key).toMatch(/^company\/logo\/[0-9a-f-]{36}\.png$/);
      expect(body).toBe(PNG_BYTES);
      expect(mime).toBe('image/png');
      expect(repo.updateLogoKey).toHaveBeenCalledWith(key);
      expect(storage.deleteObject).toHaveBeenCalledWith('company/logo/old.jpg');
      expect(result.logoUrl).toMatch(/^\/api\/company\/logo\?v=\d+$/);
    });

    it('từ chối file không phải ảnh trước khi gọi S3', async () => {
      await expect(
        service.uploadLogo(multerFile(Buffer.from('%PDF-1.4 not an image'))),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.putObject).not.toHaveBeenCalled();
    });

    it('ghi DB lỗi thì xoá file vừa tải lên và giữ logo cũ', async () => {
      repo.findCompany.mockResolvedValue(prismaCompany({ logoS3Key: 'company/logo/old.jpg' }));
      repo.updateLogoKey.mockRejectedValue(new Error('db down'));

      await expect(service.uploadLogo(multerFile(PNG_BYTES))).rejects.toThrow('db down');

      const [newKey] = storage.putObject.mock.calls[0];
      expect(storage.deleteObject).toHaveBeenCalledTimes(1);
      expect(storage.deleteObject).toHaveBeenCalledWith(newKey);
    });

    it('không làm hỏng request khi xoá logo cũ thất bại', async () => {
      repo.findCompany.mockResolvedValue(prismaCompany({ logoS3Key: 'company/logo/old.jpg' }));
      repo.updateLogoKey.mockImplementation(async (key: string) =>
        prismaCompany({ logoS3Key: key }),
      );
      storage.deleteObject.mockRejectedValue(new Error('s3 down'));

      await expect(service.uploadLogo(multerFile(PNG_BYTES))).resolves.toMatchObject({
        id: COMPANY_ID,
      });
    });

    it('ném 404 khi chưa seed doanh nghiệp, không tải gì lên S3', async () => {
      repo.findCompany.mockResolvedValue(null);

      await expect(service.uploadLogo(multerFile(PNG_BYTES))).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(storage.putObject).not.toHaveBeenCalled();
    });
  });

  describe('deleteLogo', () => {
    it('xoá key trong DB rồi xoá file trên S3', async () => {
      repo.findCompany.mockResolvedValue(prismaCompany({ logoS3Key: 'company/logo/a.png' }));
      repo.updateLogoKey.mockResolvedValue(prismaCompany());

      const result = await service.deleteLogo();

      expect(repo.updateLogoKey).toHaveBeenCalledWith(null);
      expect(storage.deleteObject).toHaveBeenCalledWith('company/logo/a.png');
      expect(result.logoUrl).toBeNull();
    });

    it('idempotent: chưa có logo thì không ghi DB, không gọi S3', async () => {
      repo.findCompany.mockResolvedValue(prismaCompany());

      const result = await service.deleteLogo();

      expect(result.logoUrl).toBeNull();
      expect(repo.updateLogoKey).not.toHaveBeenCalled();
      expect(storage.deleteObject).not.toHaveBeenCalled();
    });
  });

  describe('getLogoSignedUrl', () => {
    it('trả về presigned URL hiệu lực 1 giờ', async () => {
      repo.findCompany.mockResolvedValue(prismaCompany({ logoS3Key: 'company/logo/a.png' }));
      storage.getSignedUrl.mockResolvedValue('https://s3.example/signed');

      await expect(service.getLogoSignedUrl()).resolves.toBe('https://s3.example/signed');
      expect(storage.getSignedUrl).toHaveBeenCalledWith(
        'company/logo/a.png',
        COMPANY_LOGO_SIGNED_URL_EXPIRES_SEC,
      );
    });

    it('ném 404 khi chưa có logo', async () => {
      repo.findCompany.mockResolvedValue(prismaCompany());

      await expect(service.getLogoSignedUrl()).rejects.toBeInstanceOf(NotFoundException);
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
    ['logoUrl (logo chỉ đổi qua POST /company/logo)', { logoUrl: 'https://x.example/a.png' }],
  ])('từ chối body: %s', (_label, body) => {
    expect(UpdateCompanyBodySchema.safeParse(body).success).toBe(false);
  });
});
