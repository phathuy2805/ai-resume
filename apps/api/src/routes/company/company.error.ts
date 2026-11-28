import { NotFoundException } from '@nestjs/common';

export const CompanyNotConfiguredException = new NotFoundException(
  'Chưa cấu hình thông tin doanh nghiệp',
);
