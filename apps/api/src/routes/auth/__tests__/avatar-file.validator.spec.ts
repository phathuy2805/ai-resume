import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AVATAR_MAX_SIZE_BYTES } from '../../../shared/constants/auth.constant.js';
import { AuthErrorCode } from '../auth.error.js';
import { validateAvatarFile } from '../avatar-file.validator.js';

function makeFile(buffer: Buffer, overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'avatar.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: buffer.length,
    buffer,
    stream: undefined as unknown as Express.Multer.File['stream'],
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  };
}

describe('validateAvatarFile', () => {
  it('accepts valid JPEG magic bytes', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const res = validateAvatarFile(makeFile(jpeg, { mimetype: 'image/jpeg' }));
    expect(res).toMatchObject({ mimeType: 'image/jpeg', extension: 'jpg', size: jpeg.length });
  });

  it('accepts valid PNG magic bytes', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const res = validateAvatarFile(makeFile(png));
    expect(res).toMatchObject({ mimeType: 'image/png', extension: 'png', size: png.length });
  });

  it('accepts valid WebP magic bytes', () => {
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]);
    const res = validateAvatarFile(makeFile(webp, { mimetype: 'image/webp' }));
    expect(res).toMatchObject({ mimeType: 'image/webp', extension: 'webp', size: webp.length });
  });

  it('rejects missing or empty file with AVATAR_FILE_REQUIRED', () => {
    expect(() => validateAvatarFile(undefined)).toThrow(BadRequestException);
    try {
      validateAvatarFile(makeFile(Buffer.alloc(0)));
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: AuthErrorCode.AVATAR_FILE_REQUIRED,
      });
    }
  });

  it('rejects files larger than 2MB with AVATAR_FILE_TOO_LARGE', () => {
    const huge = Buffer.alloc(AVATAR_MAX_SIZE_BYTES + 1);
    huge[0] = 0xff;
    huge[1] = 0xd8;
    huge[2] = 0xff;
    expect(() => validateAvatarFile(makeFile(huge))).toThrow(PayloadTooLargeException);
  });

  it('rejects disguised non-image files (e.g. SVG or PDF renamed to .png)', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    try {
      validateAvatarFile(makeFile(svg, { originalname: 'fake.png', mimetype: 'image/png' }));
      expect.unreachable('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: AuthErrorCode.AVATAR_INVALID_FILE_TYPE,
      });
    }
  });
});
