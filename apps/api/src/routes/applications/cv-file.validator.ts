import { CV_MIME_TYPE, PDF_MAGIC } from './applications.constant.js';
import {
  CvFileRequiredException,
  CvInvalidFileTypeException,
} from './applications.error.js';

/**
 * Kiểm tra file CV đã nhận qua Multer (lưu trong bộ nhớ):
 * - Phải có file.
 * - mimetype là application/pdf và 4 byte đầu là "%PDF". Mimetype do trình duyệt gửi lên
 *   nên không đáng tin (VD: file .docx đổi đuôi thành .pdf), phải kiểm tra thêm nội dung.
 *
 * Dung lượng đã được giới hạn ở CvUploadInterceptor.
 */
export function assertValidCvFile(
  file: Express.Multer.File | undefined,
): asserts file is Express.Multer.File {
  if (!file || !file.buffer || file.size === 0) {
    throw CvFileRequiredException;
  }

  const header = file.buffer.subarray(0, PDF_MAGIC.length).toString('latin1');
  if (file.mimetype !== CV_MIME_TYPE || header !== PDF_MAGIC) {
    throw CvInvalidFileTypeException;
  }
}
