import { ConflictException, NotFoundException } from '@nestjs/common';
import type { ApplicationStatus } from '../constants/application-status.enum.js';

export const ApplicationStateNotFoundException = new NotFoundException(
  'Không tìm thấy hồ sơ ứng tuyển',
);

export function createInvalidApplicationTransitionException(
  fromStatus: ApplicationStatus,
  toStatus: ApplicationStatus,
): ConflictException {
  return new ConflictException(
    `Không thể chuyển trạng thái hồ sơ từ ${fromStatus} sang ${toStatus}`,
  );
}
