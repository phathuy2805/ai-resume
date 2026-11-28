import { AVATAR_MAX_SIZE_BYTES } from '../../shared/constants/auth.constant.js';
import {
  detectImageFormat,
  type ImageExtension,
  type ImageMimeType,
} from '../../shared/utils/image-file.util.js';
import {
  AvatarFileRequiredException,
  AvatarFileTooLargeException,
  AvatarInvalidFileTypeException,
} from './auth.error.js';

export interface ValidatedAvatarFile {
  buffer: Buffer;
  mimeType: ImageMimeType;
  extension: ImageExtension;
  size: number;
}

export function validateAvatarFile(file: Express.Multer.File | undefined): ValidatedAvatarFile {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw AvatarFileRequiredException;
  }

  if (file.size > AVATAR_MAX_SIZE_BYTES || file.buffer.length > AVATAR_MAX_SIZE_BYTES) {
    throw AvatarFileTooLargeException;
  }

  const format = detectImageFormat(file.buffer);
  if (!format) {
    throw AvatarInvalidFileTypeException;
  }

  return {
    buffer: file.buffer,
    mimeType: format.mimeType,
    extension: format.extension,
    size: file.buffer.length,
  };
}
