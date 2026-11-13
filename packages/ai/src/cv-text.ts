import { extractText, getDocumentProxy, getResolvedPDFJS } from 'unpdf';
import type { AiClient, CallOptions } from './client.js';
import { consoleLogger, type AiLogger } from './logger.js';

// ── Lỗi ────────────────────────────────────────────────────────────────

export const CV_EXTRACTION_ERROR_CODES = [
  'EMPTY',
  'SCANNED',
  'ENCRYPTED',
  'CORRUPTED',
  'TOO_MANY_PAGES',
] as const;
export type CvExtractionErrorCode = (typeof CV_EXTRACTION_ERROR_CODES)[number];

/** Câu thông báo cho ứng viên (BE trả kèm 422, FE hiển thị). Dùng chung để BE và FE thống nhất. */
export const CV_EXTRACTION_MESSAGES_VI: Readonly<Record<CvExtractionErrorCode, string>> = {
  EMPTY: 'File CV không có nội dung. Vui lòng kiểm tra lại file.',
  SCANNED:
    'CV có vẻ là ảnh scan hoặc ảnh chụp nên hệ thống không đọc được chữ. Vui lòng nộp file PDF xuất trực tiếp từ Word, Google Docs hoặc Canva.',
  ENCRYPTED: 'File CV đang được đặt mật khẩu. Vui lòng gỡ mật khẩu rồi nộp lại.',
  CORRUPTED: 'File CV bị hỏng hoặc không phải PDF hợp lệ. Vui lòng xuất lại file rồi nộp lại.',
  TOO_MANY_PAGES: 'CV dài quá số trang cho phép (tối đa 10 trang). Vui lòng rút gọn rồi nộp lại.',
};

/** Lỗi do chính file CV (không phải lỗi gọi AI): BE chuyển thành 422 cho ứng viên. */
export class CvExtractionError extends Error {
  readonly code: CvExtractionErrorCode;
  readonly pageCount?: number;
  readonly charCount?: number;

  constructor(
    code: CvExtractionErrorCode,
    details: { pageCount?: number; charCount?: number; cause?: unknown } = {},
  ) {
    super(`CV text extraction failed: ${code}`, { cause: details.cause });
    this.name = 'CvExtractionError';
    this.code = code;
    this.pageCount = details.pageCount;
    this.charCount = details.charCount;
  }

  /** Câu thông báo tiếng Việt cho ứng viên. */
  get messageVi(): string {
    return CV_EXTRACTION_MESSAGES_VI[this.code];
  }
}

export function isCvExtractionError(error: unknown): error is CvExtractionError {
  return error instanceof CvExtractionError;
}

// ── Làm sạch và cắt chữ ────────────────────────────────────────────────

const REPLACEMENT_CHARACTER = String.fromCodePoint(0xfffd); // '�' do font lỗi

/**
 * Làm sạch chữ trích từ PDF:
 * - Chuẩn hóa Unicode NFC (gộp dấu tiếng Việt bị tách rời).
 * - Bỏ ký tự điều khiển, ký tự vô hình (zero-width, BOM, soft hyphen) và ký tự lỗi '�'.
 * - Gộp khoảng trắng thừa, cắt khoảng trắng đầu/cuối dòng.
 * - Giữ xuống dòng; 3 dòng trống trở lên gộp thành 1 dòng trống.
 */
export function cleanCvText(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(/[^\P{Cc}\s]|\p{Cf}/gu, '')
    .replaceAll(REPLACEMENT_CHARACTER, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Cắt chữ dài hơn maxChars. Ưu tiên cắt ở chỗ xuống dòng gần nhất (không lùi quá 20%)
 * để không đứt giữa câu; không cắt đôi một ký tự Unicode 2 phần (emoji...).
 */
export function truncateCvText(
  text: string,
  maxChars: number,
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  let end = maxChars;
  const lastBreak = text.lastIndexOf('\n', maxChars);
  if (lastBreak >= maxChars * 0.8) end = lastBreak;
  const code = text.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1;
  return { text: text.slice(0, end).trimEnd(), truncated: true };
}

// ── Trích chữ ──────────────────────────────────────────────────────────

export type CvTextSource = 'pdf-text' | 'ai-ocr';

export interface CvExtractionResult {
  text: string;
  pageCount: number;
  /** Số ký tự của `text` trả về. */
  charCount: number;
  /** true nếu chữ dài quá giới hạn và đã bị cắt. */
  truncated: boolean;
  /** 'pdf-text': lấy từ lớp chữ của PDF (chính xác). 'ai-ocr': Gemini đọc từ ảnh scan (có thể sai sót). */
  source: CvTextSource;
}

export interface ExtractCvTextOptions {
  /** Mặc định 10. */
  maxPages?: number;
  /** Mặc định 20.000. */
  maxChars?: number;
  /** Trung bình dưới số ký tự này mỗi trang thì coi là ảnh scan. Mặc định 100. */
  minCharsPerPage?: number;
  /** Mặc định console. */
  logger?: AiLogger;
  /**
   * Bật đọc dự phòng bằng Gemini cho CV dạng ảnh scan.
   * Không truyền: file scan bị từ chối (SCANNED). Gemini lỗi hoặc đọc không đủ chữ: cũng từ chối (SCANNED).
   */
  ocrFallback?: { ai: AiClient; callOptions?: CallOptions };
}

export const DEFAULT_MAX_PAGES = 10;
export const DEFAULT_MAX_CHARS = 20_000;
export const DEFAULT_MIN_CHARS_PER_PAGE = 100;

type PdfDocument = Awaited<ReturnType<typeof getDocumentProxy>>;

/** Mã thao tác "vẽ ảnh" của PDF.js, để nhận biết trang có hình. */
async function imageOperationCodes(): Promise<Set<number>> {
  const { OPS } = await getResolvedPDFJS();
  return new Set(
    Object.entries(OPS)
      .filter(([name]) => /^paint.*Image/.test(name))
      .map(([, code]) => code as number),
  );
}

async function hasImages(pdf: PdfDocument): Promise<boolean> {
  const imageOps = await imageOperationCodes();
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const { fnArray } = await page.getOperatorList();
    if (fnArray.some((fn) => imageOps.has(fn))) return true;
  }
  return false;
}

async function openPdf(data: Uint8Array): Promise<PdfDocument> {
  try {
    // Truyền BẢN SAO: PDF.js có thể chiếm (detach) bộ nhớ của mảng truyền vào,
    // trong khi BE còn cần dùng lại đúng bytes đó để upload S3 hoặc gửi Gemini.
    return await getDocumentProxy(new Uint8Array(data));
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    throw new CvExtractionError(name === 'PasswordException' ? 'ENCRYPTED' : 'CORRUPTED', {
      cause: error,
    });
  }
}

/**
 * Trích chữ từ file CV PDF bằng unpdf (không tải file qua mạng, chỉ nhận bytes).
 * CV dạng ảnh scan: từ chối (SCANNED), hoặc nhờ Gemini đọc nếu bật `ocrFallback`.
 *
 * @throws CvExtractionError với mã EMPTY | SCANNED | ENCRYPTED | CORRUPTED | TOO_MANY_PAGES
 */
export async function extractCvText(
  data: Uint8Array,
  options: ExtractCvTextOptions = {},
): Promise<CvExtractionResult> {
  const {
    maxPages = DEFAULT_MAX_PAGES,
    maxChars = DEFAULT_MAX_CHARS,
    minCharsPerPage = DEFAULT_MIN_CHARS_PER_PAGE,
    logger = consoleLogger,
    ocrFallback,
  } = options;
  const startedAt = performance.now();
  const elapsedMs = () => Math.round(performance.now() - startedAt);

  const finish = (text: string, pageCount: number, source: CvTextSource): CvExtractionResult => {
    const cut = truncateCvText(text, maxChars);
    return {
      text: cut.text,
      pageCount,
      charCount: cut.text.length,
      truncated: cut.truncated,
      source,
    };
  };

  const run = async (): Promise<CvExtractionResult> => {
    const pdf = await openPdf(data);
    try {
      const pageCount = pdf.numPages;
      if (pageCount > maxPages) throw new CvExtractionError('TOO_MANY_PAGES', { pageCount });

      let pages: string[];
      try {
        pages = (await extractText(pdf, { mergePages: false })).text.map(cleanCvText);
      } catch (error) {
        throw new CvExtractionError('CORRUPTED', { pageCount, cause: error });
      }
      const text = pages.filter(Boolean).join('\n\n');
      const minChars = minCharsPerPage * pageCount;
      if (text.length >= minChars) return finish(text, pageCount, 'pdf-text');

      // Ít chữ: không chữ + không hình là file trống; còn lại nhiều khả năng là ảnh scan.
      const charCount = text.length;
      if (charCount === 0 && !(await hasImages(pdf))) {
        throw new CvExtractionError('EMPTY', { pageCount, charCount });
      }
      if (!ocrFallback) throw new CvExtractionError('SCANNED', { pageCount, charCount });

      let ocrText: string;
      try {
        ocrText = cleanCvText(await ocrFallback.ai.readPdfText(data, ocrFallback.callOptions));
      } catch (error) {
        throw new CvExtractionError('SCANNED', { pageCount, charCount, cause: error });
      }
      if (ocrText.length < minChars) {
        throw new CvExtractionError('SCANNED', { pageCount, charCount: ocrText.length });
      }
      return finish(ocrText, pageCount, 'ai-ocr');
    } finally {
      // Đóng file, giải phóng bộ nhớ của PDF.js (kể cả khi lỗi).
      await pdf.loadingTask.destroy();
    }
  };

  try {
    const result = await run();
    logger.log(
      `ai.extractCvText ok source=${result.source} pages=${result.pageCount} chars=${result.charCount} truncated=${result.truncated} durationMs=${elapsedMs()}`,
    );
    return result;
  } catch (error) {
    const code = error instanceof CvExtractionError ? error.code : 'UNKNOWN';
    const pages = error instanceof CvExtractionError ? (error.pageCount ?? 'n/a') : 'n/a';
    const chars = error instanceof CvExtractionError ? (error.charCount ?? 'n/a') : 'n/a';
    logger.warn(
      `ai.extractCvText failed code=${code} pages=${pages} chars=${chars} durationMs=${elapsedMs()}`,
    );
    throw error;
  }
}
