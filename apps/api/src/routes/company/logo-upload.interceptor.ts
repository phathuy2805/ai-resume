import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Observable } from 'rxjs';
import { COMPANY_LOGO_FILE_FIELD, COMPANY_LOGO_MAX_SIZE_BYTES } from './company.constant.js';
import { CompanyLogoFileTooLargeException } from './company.error.js';

/** Multer giữ file trong bộ nhớ, chỉ nhận 1 file ở field "file", chặn file quá lớn ngay khi đọc. */
const MulterLogoInterceptor = FileInterceptor(COMPANY_LOGO_FILE_FIELD, {
  limits: { fileSize: COMPANY_LOGO_MAX_SIZE_BYTES, files: 1 },
  defParamCharset: 'utf8',
});

/** Đổi lỗi "File too large" mặc định của Multer thành lỗi có mã LOGO_FILE_TOO_LARGE. */
@Injectable()
export class LogoUploadInterceptor implements NestInterceptor {
  private readonly multer: NestInterceptor = new MulterLogoInterceptor();

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    try {
      return await this.multer.intercept(context, next);
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw CompanyLogoFileTooLargeException;
      }
      throw error;
    }
  }
}
