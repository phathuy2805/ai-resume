import {
  CV_MIME_TYPE,
  PDF_HEADER_SEARCH_BYTES,
  PDF_MAGIC,
} from './applications.constant.js';
import {
  CvFileRequiredException,
  CvInvalidFileTypeException,
} from './applications.error.js';

/**
 * Kiểm tra file CV đã nhận qua Multer (lưu trong bộ nhớ):
 * - Phải có file.
 * - mimetype là application/pdf và có header "%PDF" trong 1024 byte đầu. Mimetype do trình
 *   duyệt gửi lên nên không đáng tin (VD: file .docx đổi đuôi thành .pdf), phải kiểm tra
 *   thêm nội dung. File hỏng nhưng có header vẫn qua bước này và bị chặn ở bước trích text (422).
 *
 * Dung lượng đã được giới hạn ở CvUploadInterceptor.
 */
export function assertValidCvFile(
  file: Express.Multer.File | undefined,
): asserts file is Express.Multer.File {
  if (!file || !file.buffer || file.size === 0) {
    throw CvFileRequiredException;
  }

  const hasPdfHeader = file.buffer
    .subarray(0, PDF_HEADER_SEARCH_BYTES)
    .includes(PDF_MAGIC, 0, 'latin1');
  if (file.mimetype !== CV_MIME_TYPE || !hasPdfHeader) {
    throw CvInvalidFileTypeException;
  }
}
