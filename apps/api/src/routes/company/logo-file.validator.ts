import {
  detectImageFormat,
  type ImageExtension,
  type ImageMimeType,
} from '../../shared/utils/image-file.util.js';
import { COMPANY_LOGO_MAX_SIZE_BYTES } from './company.constant.js';
import {
  CompanyLogoFileRequiredException,
  CompanyLogoFileTooLargeException,
  CompanyLogoInvalidFileTypeException,
} from './company.error.js';

export interface ValidatedLogoFile {
  buffer: Buffer;
  mimeType: ImageMimeType;
  extension: ImageExtension;
}

export function validateLogoFile(file: Express.Multer.File | undefined): ValidatedLogoFile {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw CompanyLogoFileRequiredException;
  }

  if (file.size > COMPANY_LOGO_MAX_SIZE_BYTES || file.buffer.length > COMPANY_LOGO_MAX_SIZE_BYTES) {
    throw CompanyLogoFileTooLargeException;
  }

  const format = detectImageFormat(file.buffer);
  if (!format) {
    throw CompanyLogoInvalidFileTypeException;
  }

  return { buffer: file.buffer, mimeType: format.mimeType, extension: format.extension };
}
