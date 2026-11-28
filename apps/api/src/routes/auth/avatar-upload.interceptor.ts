import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Observable } from 'rxjs';
import { AVATAR_FILE_FIELD, AVATAR_MAX_SIZE_BYTES } from '../../shared/constants/auth.constant.js';
import { AvatarFileTooLargeException } from './auth.error.js';

const MulterAvatarInterceptor = FileInterceptor(AVATAR_FILE_FIELD, {
  limits: { fileSize: AVATAR_MAX_SIZE_BYTES, files: 1 },
  defParamCharset: 'utf8',
});

@Injectable()
export class AvatarUploadInterceptor implements NestInterceptor {
  private readonly multer: NestInterceptor = new MulterAvatarInterceptor();

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    try {
      return await this.multer.intercept(context, next);
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw AvatarFileTooLargeException;
      }
      throw error;
    }
  }
}
