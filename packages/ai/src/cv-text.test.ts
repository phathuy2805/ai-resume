import { readFileSync } from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { describe, expect, it, vi } from 'vitest';
import type { AiClient } from './client.js';
import {
  cleanCvText,
  CV_EXTRACTION_ERROR_CODES,
  CV_EXTRACTION_MESSAGES_VI,
  CvExtractionError,
  extractCvText,
  truncateCvText,
  type CvExtractionErrorCode,
} from './cv-text.js';
import { AiRateLimitError } from './errors.js';
import type { AiLogger } from './logger.js';

const FIXTURES = path.resolve(import.meta.dirname, '../fixtures/cvs');
const readFixture = (name: string) => new Uint8Array(readFileSync(path.join(FIXTURES, name)));

/** Đoạn chữ ASCII đủ dài (> 100 ký tự) để không bị coi là ảnh scan. */
const LONG_TEXT =
  'Backend Developer with 4 years of experience in NodeJS, NestJS, PostgreSQL and Docker. ' +
  'Built RESTful APIs and background job pipelines.';

/** Tạo PDF trong bộ nhớ bằng pdfkit: mỗi phần tử là nội dung 1 trang ('' = trang trắng). */
function makePdf(pages: string[], options: PDFKit.PDFDocumentOptions = {}): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ ...options, autoFirstPage: false });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))));
    for (const text of pages) {
      doc.addPage();
      if (text) doc.text(text);
    }
    doc.end();
  });
}

function fakeLogger() {
  const lines: string[] = [];
  const logger: AiLogger = {
    log: (m) => void lines.push(`log ${m}`),
    warn: (m) => void lines.push(`warn ${m}`),
    error: (m) => void lines.push(`error ${m}`),
  };
  return { logger, lines };
}

async function expectCode(promise: Promise<unknown>, code: CvExtractionErrorCode) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(CvExtractionError);
  expect((error as CvExtractionError).code).toBe(code);
  return error as CvExtractionError;
}

describe('cleanCvText', () => {
  it('chuẩn hóa NFC: gộp dấu tiếng Việt bị tách rời', () => {
    const decomposed = 'Nguyễn Văn Ánh – Kỹ sư phần mềm'.normalize('NFD');
    expect(decomposed).not.toBe(decomposed.normalize('NFC'));
    expect(cleanCvText(decomposed)).toBe('Nguyễn Văn Ánh – Kỹ sư phần mềm');
  });

  it('bỏ ký tự điều khiển, ký tự vô hình và ký tự lỗi', () => {
    const junk = [0x00, 0x07, 0x200b, 0xfeff, 0xad, 0xfffd].map((c) => String.fromCodePoint(c));
    expect(cleanCvText(`Node${junk.join('')}JS`)).toBe('NodeJS');
  });

  it('gộp khoảng trắng, tab, khoảng trắng không ngắt; cắt khoảng trắng đầu/cuối dòng', () => {
    const nbsp = String.fromCodePoint(0xa0);
    expect(cleanCvText(`  Kỹ năng:\t\tNodeJS ${nbsp}${nbsp} NestJS   `)).toBe(
      'Kỹ năng: NodeJS NestJS',
    );
  });

  it('giữ xuống dòng, gộp nhiều dòng trống thành 1, đổi CRLF thành LF', () => {
    expect(cleanCvText('KINH NGHIỆM\r\n• Dòng 1\r\n\r\n\r\n\r\nHỌC VẤN\n')).toBe(
      'KINH NGHIỆM\n• Dòng 1\n\nHỌC VẤN',
    );
  });
});

describe('truncateCvText', () => {
  it('chữ ngắn thì giữ nguyên', () => {
    expect(truncateCvText('abc', 10)).toEqual({ text: 'abc', truncated: false });
  });

  it('cắt ở chỗ xuống dòng gần nhất nếu không lùi quá 20%', () => {
    const text = `${'a'.repeat(90)}\n${'b'.repeat(50)}`;
    expect(truncateCvText(text, 100)).toEqual({ text: 'a'.repeat(90), truncated: true });
  });

  it('không có chỗ xuống dòng phù hợp thì cắt đúng giới hạn', () => {
    expect(truncateCvText(`${'a'.repeat(10)}\n${'b'.repeat(200)}`, 100).text).toHaveLength(100);
  });

  it('không cắt đôi một ký tự 2 phần (emoji)', () => {
    const emoji = String.fromCodePoint(0x1f600);
    const result = truncateCvText(`${'a'.repeat(99)}${emoji}zzz`, 100);
    expect(result.text).toBe('a'.repeat(99));
  });
});

describe('CvExtractionError', () => {
  it('mỗi mã lỗi đều có câu thông báo tiếng Việt', () => {
    for (const code of CV_EXTRACTION_ERROR_CODES) {
      expect(CV_EXTRACTION_MESSAGES_VI[code].length).toBeGreaterThan(10);
      expect(new CvExtractionError(code).messageVi).toBe(CV_EXTRACTION_MESSAGES_VI[code]);
    }
  });
});

describe('extractCvText: đọc PDF có chữ', () => {
  it('trả về text, số trang, số ký tự, truncated và nguồn pdf-text', async () => {
    const pdf = await makePdf([LONG_TEXT, LONG_TEXT]);
    const result = await extractCvText(pdf, { logger: fakeLogger().logger });

    expect(result).toMatchObject({ pageCount: 2, truncated: false, source: 'pdf-text' });
    expect(result.text).toContain('NodeJS, NestJS, PostgreSQL');
    expect(result.charCount).toBe(result.text.length);
  });

  it('chữ dài quá maxChars thì bị cắt và đánh dấu truncated', async () => {
    const pdf = await makePdf([LONG_TEXT, LONG_TEXT, LONG_TEXT]);
    const result = await extractCvText(pdf, { maxChars: 200, logger: fakeLogger().logger });

    expect(result.truncated).toBe(true);
    expect(result.charCount).toBeLessThanOrEqual(200);
  });

  it('KHÔNG làm hỏng mảng bytes truyền vào (BE còn upload đúng bytes đó lên S3)', async () => {
    const pdf = await makePdf([LONG_TEXT]);
    const size = pdf.byteLength;

    await extractCvText(pdf, { logger: fakeLogger().logger });
    expect(pdf.byteLength).toBe(size);
  });

  it('PDF chỉ khóa quyền chỉnh sửa (vẫn mở xem được) thì đọc bình thường', async () => {
    const pdf = await makePdf([LONG_TEXT], {
      ownerPassword: 'owner',
      permissions: { modifying: false },
    });
    await expect(extractCvText(pdf, { logger: fakeLogger().logger })).resolves.toMatchObject({
      source: 'pdf-text',
    });
  });
});

describe('extractCvText: các mã lỗi', () => {
  const { logger } = fakeLogger();

  it('ENCRYPTED: PDF có mật khẩu mở file', async () => {
    const pdf = await makePdf([LONG_TEXT], { userPassword: 'secret' });
    await expectCode(extractCvText(pdf, { logger }), 'ENCRYPTED');
  });

  it.each([
    ['file bị cắt nửa', async () => (await makePdf([LONG_TEXT])).slice(0, 400)],
    ['không phải PDF', async () => new TextEncoder().encode('hello, not a pdf')],
    ['file 0 byte', async () => new Uint8Array()],
  ])('CORRUPTED: %s', async (_label, build) => {
    await expectCode(extractCvText(await build(), { logger }), 'CORRUPTED');
  });

  it('TOO_MANY_PAGES: quá maxPages, báo kèm số trang', async () => {
    const pdf = await makePdf(Array.from({ length: 11 }, () => LONG_TEXT));
    const error = await expectCode(extractCvText(pdf, { logger }), 'TOO_MANY_PAGES');
    expect(error.pageCount).toBe(11);
  });

  it('EMPTY: không có chữ và không có hình', async () => {
    const pdf = await makePdf(['']);
    await expectCode(extractCvText(pdf, { logger }), 'EMPTY');
  });

  it('SCANNED: có chữ nhưng trung bình dưới 100 ký tự/trang', async () => {
    const pdf = await makePdf(['Nguyen Van A', '']);
    const error = await expectCode(extractCvText(pdf, { logger }), 'SCANNED');
    expect(error.pageCount).toBe(2);
  });

  it.each(['scans/cv_scan_01.pdf', 'scans/cv_scan_02.pdf'])(
    'SCANNED: file chỉ có ảnh (%s), không bị nhầm là EMPTY',
    async (file) => {
      await expectCode(extractCvText(readFixture(file), { logger }), 'SCANNED');
    },
  );
});

describe('extractCvText: Gemini đọc dự phòng CV dạng ảnh scan (ocrFallback)', () => {
  const OCR_TEXT = `HO SO UNG VIEN\n${LONG_TEXT}`;

  function fakeAi(readPdfText: AiClient['readPdfText']) {
    const fn = vi.fn(readPdfText);
    return { ai: { readPdfText: fn } as unknown as AiClient, readPdfText: fn };
  }

  it('file scan: nhờ Gemini đọc, trả chữ đã làm sạch với nguồn ai-ocr', async () => {
    const { ai, readPdfText } = fakeAi(async () => `  ${OCR_TEXT}  `);
    const scan = readFixture('scans/cv_scan_01.pdf');

    const result = await extractCvText(scan, { ocrFallback: { ai }, logger: fakeLogger().logger });

    expect(result).toMatchObject({ source: 'ai-ocr', pageCount: 1, text: OCR_TEXT });
    expect(readPdfText).toHaveBeenCalledTimes(1);
    expect(readPdfText.mock.calls[0]![0].byteLength).toBe(scan.byteLength);
  });

  it('Gemini đọc được quá ít chữ: vẫn từ chối SCANNED', async () => {
    const { ai } = fakeAi(async () => 'abc');
    await expectCode(
      extractCvText(readFixture('scans/cv_scan_02.pdf'), {
        ocrFallback: { ai },
        logger: fakeLogger().logger,
      }),
      'SCANNED',
    );
  });

  it('Gemini lỗi (vd. hết quota): từ chối SCANNED, giữ lỗi gốc trong cause', async () => {
    const aiError = new AiRateLimitError({ attempts: 4 });
    const { ai } = fakeAi(async () => {
      throw aiError;
    });
    const error = await expectCode(
      extractCvText(readFixture('scans/cv_scan_01.pdf'), {
        ocrFallback: { ai },
        logger: fakeLogger().logger,
      }),
      'SCANNED',
    );
    expect(error.cause).toBe(aiError);
  });

  it('chỉ gọi Gemini cho trường hợp scan; PDF có chữ, file trống, file mật khẩu thì không gọi', async () => {
    const { ai, readPdfText } = fakeAi(async () => OCR_TEXT);
    const { logger } = fakeLogger();

    await extractCvText(await makePdf([LONG_TEXT]), { ocrFallback: { ai }, logger });
    await expectCode(extractCvText(await makePdf(['']), { ocrFallback: { ai }, logger }), 'EMPTY');
    await expectCode(
      extractCvText(await makePdf([LONG_TEXT], { userPassword: 'x' }), {
        ocrFallback: { ai },
        logger,
      }),
      'ENCRYPTED',
    );
    expect(readPdfText).not.toHaveBeenCalled();
  });
});

describe('extractCvText: log', () => {
  it('chỉ ghi số trang, số ký tự, mã lỗi, thời gian; không ghi nội dung CV', async () => {
    const { logger, lines } = fakeLogger();

    await extractCvText(await makePdf([LONG_TEXT]), { logger });
    await extractCvText(readFixture('scans/cv_scan_01.pdf'), { logger }).catch(() => {});

    expect(lines[0]).toMatch(
      /^log ai\.extractCvText ok source=pdf-text pages=1 chars=\d+ truncated=false durationMs=\d+$/,
    );
    expect(lines[1]).toMatch(
      /^warn ai\.extractCvText failed code=SCANNED pages=1 chars=0 durationMs=\d+$/,
    );
    expect(lines.join('\n')).not.toContain('NodeJS');
  });
});

describe('extractCvText: 30 CV của W1-AI-01', () => {
  const files = Array.from({ length: 10 }, (_, i) => String(i + 1).padStart(2, '0')).flatMap(
    (n) => [`cv_be_${n}.pdf`, `cv_da_${n}.pdf`, `cv_mkt_${n}.pdf`],
  );

  it.each(files)('%s: đọc được, 1 trang, không bị cắt', async (file) => {
    const result = await extractCvText(readFixture(file), { logger: fakeLogger().logger });

    expect(result).toMatchObject({ pageCount: 1, truncated: false, source: 'pdf-text' });
    expect(result.charCount).toBeGreaterThan(900);
    expect(result.text).toBe(result.text.normalize('NFC'));
  });
});
