import { BadRequestException, NotFoundException, PayloadTooLargeException } from '@nestjs/common';

export enum CompanyErrorCode {
  COMPANY_NOT_CONFIGURED = 'COMPANY_NOT_CONFIGURED',
  LOGO_FILE_REQUIRED = 'LOGO_FILE_REQUIRED',
  LOGO_INVALID_FILE_TYPE = 'LOGO_INVALID_FILE_TYPE',
  LOGO_FILE_TOO_LARGE = 'LOGO_FILE_TOO_LARGE',
  LOGO_NOT_FOUND = 'LOGO_NOT_FOUND',
}

export const CompanyNotConfiguredException = new NotFoundException({
  code: CompanyErrorCode.COMPANY_NOT_CONFIGURED,
  message: 'Chưa cấu hình thông tin doanh nghiệp',
});

export const CompanyLogoFileRequiredException = new BadRequestException({
  code: CompanyErrorCode.LOGO_FILE_REQUIRED,
  message: 'Vui lòng chọn ảnh logo để tải lên',
});

export const CompanyLogoInvalidFileTypeException = new BadRequestException({
  code: CompanyErrorCode.LOGO_INVALID_FILE_TYPE,
  message: 'Logo chỉ hỗ trợ định dạng JPG, PNG hoặc WebP',
});

export const CompanyLogoFileTooLargeException = new PayloadTooLargeException({
  code: CompanyErrorCode.LOGO_FILE_TOO_LARGE,
  message: 'Logo có dung lượng tối đa 2MB',
});

export const CompanyLogoNotFoundException = new NotFoundException({
  code: CompanyErrorCode.LOGO_NOT_FOUND,
  message: 'Doanh nghiệp chưa có logo',
});
