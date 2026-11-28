import { AVATAR_MAX_SIZE_BYTES } from '../../shared/constants/auth.constant.js';
import {
  AvatarFileRequiredException,
  AvatarFileTooLargeException,
  AvatarInvalidFileTypeException,
} from './auth.error.js';

export interface ValidatedAvatarFile {
  buffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
  size: number;
}

function detectImageFormat(
  buffer: Buffer,
): { mimeType: ValidatedAvatarFile['mimeType']; extension: ValidatedAvatarFile['extension'] } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', extension: 'png' };
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }

  return null;
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
