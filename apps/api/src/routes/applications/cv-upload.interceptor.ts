import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Observable } from 'rxjs';
import { CV_FILE_FIELD, CV_MAX_SIZE_BYTES } from './applications.constant.js';
import { CvFileTooLargeException } from './applications.error.js';

/**
 * Multer giữ file trong bộ nhớ (không khai báo storage/dest), chỉ nhận 1 file ở field "file".
 * Giới hạn dung lượng ngay khi đọc request để file quá lớn không bị đọc hết vào RAM.
 */
const MulterCvInterceptor = FileInterceptor(CV_FILE_FIELD, {
  limits: { fileSize: CV_MAX_SIZE_BYTES, files: 1 },
});

/**
 * Nhận file CV, đổi lỗi "File too large" mặc định của Multer thành lỗi có mã
 * CV_FILE_TOO_LARGE và thông báo tiếng Việt.
 */
@Injectable()
export class CvUploadInterceptor implements NestInterceptor {
  private readonly multer: NestInterceptor = new MulterCvInterceptor();

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    try {
      return await this.multer.intercept(context, next);
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw CvFileTooLargeException;
      }
      throw error;
    }
  }
}
