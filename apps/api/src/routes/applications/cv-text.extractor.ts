import {
  type CvExtractionResult,
  extractCvText,
  isCvExtractionError,
} from '@hireflow/ai';
import { Injectable, Logger } from '@nestjs/common';
import { toCvExtractionHttpException } from './applications.error.js';

/**
 * Trích chữ từ CV PDF ngay khi nộp (W1-AI-03), để tuần 2 chấm điểm không phải tải lại file.
 * - CV lỗi (scan, có mật khẩu, hỏng, trống, quá 10 trang) → 422 kèm `code`.
 * - Không bật ocrFallback: CV scan bị từ chối để ứng viên nộp lại bản PDF có chữ.
 * - Lỗi bất ngờ khác ném lại (500).
 *
 * Tách thành provider để service và unit test mock được.
 */
@Injectable()
export class CvTextExtractor {
  private readonly logger = new Logger(CvTextExtractor.name);

  async extract(buffer: Buffer): Promise<CvExtractionResult> {
    try {
      return await extractCvText(new Uint8Array(buffer), {
        logger: this.logger,
      });
    } catch (error) {
      if (isCvExtractionError(error)) {
        throw toCvExtractionHttpException(error);
      }
      throw error;
    }
  }
}
