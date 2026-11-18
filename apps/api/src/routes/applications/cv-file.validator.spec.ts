import { BadRequestException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ApplicationErrorCode } from './applications.error.js';
import { assertValidCvFile } from './cv-file.validator.js';

const REAL_PDF = readFileSync(
  path.resolve(
    import.meta.dirname,
    '../../../../../packages/ai/fixtures/cvs/cv_be_01.pdf',
  ),
);

function makeFile(
  buffer: Buffer,
  mimetype = 'application/pdf',
  originalname = 'cv.pdf',
): Express.Multer.File {
  return {
    buffer,
    mimetype,
    originalname,
    size: buffer.length,
  } as Express.Multer.File;
}

function codeOf(fn: () => void): string | undefined {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return ((error as BadRequestException).getResponse() as { code?: string })
      .code;
  }
  throw new Error('Expected assertValidCvFile to throw');
}

describe('assertValidCvFile', () => {
  it('PDF thật: hợp lệ', () => {
    expect(() => assertValidCvFile(makeFile(REAL_PDF))).not.toThrow();
  });

  it('không có file → CV_FILE_REQUIRED', () => {
    expect(codeOf(() => assertValidCvFile(undefined))).toBe(
      ApplicationErrorCode.CV_FILE_REQUIRED,
    );
  });

  it('file rỗng → CV_FILE_REQUIRED', () => {
    expect(codeOf(() => assertValidCvFile(makeFile(Buffer.alloc(0))))).toBe(
      ApplicationErrorCode.CV_FILE_REQUIRED,
    );
  });

  it('mimetype không phải PDF → CV_INVALID_FILE_TYPE', () => {
    const file = makeFile(REAL_PDF, 'image/png', 'cv.png');
    expect(codeOf(() => assertValidCvFile(file))).toBe(
      ApplicationErrorCode.CV_INVALID_FILE_TYPE,
    );
  });

  it('file .docx đổi đuôi .pdf (mimetype PDF nhưng nội dung là ZIP) → CV_INVALID_FILE_TYPE', () => {
    const docx = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.alloc(100),
    ]);
    expect(codeOf(() => assertValidCvFile(makeFile(docx)))).toBe(
      ApplicationErrorCode.CV_INVALID_FILE_TYPE,
    );
  });

  it('file ngắn hơn 4 byte → CV_INVALID_FILE_TYPE', () => {
    expect(codeOf(() => assertValidCvFile(makeFile(Buffer.from('%P'))))).toBe(
      ApplicationErrorCode.CV_INVALID_FILE_TYPE,
    );
  });
});
