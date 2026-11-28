import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { COMPANY_LOGO_MAX_SIZE_BYTES } from './company.constant.js';
import { validateLogoFile } from './logo-file.validator.js';

const file = (buffer: Buffer, size = buffer.length) => ({ buffer, size }) as Express.Multer.File;

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBP'),
  Buffer.from([0]),
]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

describe('validateLogoFile', () => {
  it.each([
    ['JPEG', JPEG, 'image/jpeg', 'jpg'],
    ['PNG', PNG, 'image/png', 'png'],
    ['WebP', WEBP, 'image/webp', 'webp'],
  ])('nhận %s theo magic bytes', (_label, buffer, mimeType, extension) => {
    expect(validateLogoFile(file(buffer))).toMatchObject({ mimeType, extension });
  });

  it('báo thiếu file khi không có file hoặc file rỗng', () => {
    expect(() => validateLogoFile(undefined)).toThrow(BadRequestException);
    expect(() => validateLogoFile(file(Buffer.alloc(0)))).toThrow(BadRequestException);
  });

  it('từ chối SVG và file giả đuôi ảnh', () => {
    expect(() => validateLogoFile(file(SVG))).toThrow(BadRequestException);
    expect(() => validateLogoFile(file(Buffer.from('%PDF-1.4')))).toThrow(BadRequestException);
  });

  it('từ chối file vượt 2MB', () => {
    expect(() => validateLogoFile(file(PNG, COMPANY_LOGO_MAX_SIZE_BYTES + 1))).toThrow(
      PayloadTooLargeException,
    );
  });
});
