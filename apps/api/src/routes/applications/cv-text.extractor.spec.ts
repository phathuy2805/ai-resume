import {
  CV_EXTRACTION_MESSAGES_VI,
  CvExtractionError,
  type CvExtractionErrorCode,
} from '@hireflow/ai';
import { UnprocessableEntityException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CvTextExtractor } from './cv-text.extractor.js';

const mocks = vi.hoisted(() => ({ extractCvText: vi.fn() }));

vi.mock('@hireflow/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hireflow/ai')>();
  return { ...actual, extractCvText: mocks.extractCvText };
});

const CODES: CvExtractionErrorCode[] = [
  'EMPTY',
  'SCANNED',
  'ENCRYPTED',
  'CORRUPTED',
  'TOO_MANY_PAGES',
];

describe('CvTextExtractor', () => {
  const extractor = new CvTextExtractor();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('thành công: trả kết quả, truyền bytes dạng Uint8Array', async () => {
    const result = {
      text: 'Kỹ năng: NestJS',
      pageCount: 1,
      charCount: 15,
      truncated: false,
      source: 'pdf-text' as const,
    };
    mocks.extractCvText.mockResolvedValueOnce(result);

    await expect(extractor.extract(Buffer.from('%PDF-1.7'))).resolves.toBe(
      result,
    );
    const [data, options] = mocks.extractCvText.mock.calls[0];
    expect(data).toBeInstanceOf(Uint8Array);
    expect(options).not.toHaveProperty('ocrFallback');
  });

  it.each(CODES)(
    'lỗi %s → 422 kèm code và thông báo tiếng Việt',
    async (code) => {
      mocks.extractCvText.mockRejectedValueOnce(new CvExtractionError(code));

      const error = await extractor
        .extract(Buffer.from('%PDF'))
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).getResponse()).toEqual({
        message: CV_EXTRACTION_MESSAGES_VI[code],
        code,
      });
    },
  );

  it('lỗi bất ngờ (không phải CvExtractionError) → ném lại nguyên vẹn', async () => {
    const boom = new Error('unpdf crashed');
    mocks.extractCvText.mockRejectedValueOnce(boom);

    await expect(extractor.extract(Buffer.from('%PDF'))).rejects.toBe(boom);
  });
});
