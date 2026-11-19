import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

export const JobNotFoundException = new NotFoundException('Không tìm thấy tin tuyển dụng');

export const OpenJobNotFoundException = new NotFoundException(
  'Không tìm thấy tin tuyển dụng hoặc tin đã đóng',
);

export const JobUpdateForbiddenException = new ForbiddenException(
  'Bạn không có quyền chỉnh sửa tin tuyển dụng này',
);

export const JobCloseForbiddenException = new ForbiddenException(
  'Bạn không có quyền đóng tin tuyển dụng này',
);

export const JobAlreadyClosedException = new ConflictException(
  'Không thể chỉnh sửa tin tuyển dụng đã đóng',
);
