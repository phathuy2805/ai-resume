import type { ApplicationStatus } from './application-status.enum.js';

export const APPLICATION_STATUS_CHANGED_EVENT = 'application.status_changed';

export interface ApplicationStatusChangedPayload {
  applicationId: string;
  jobId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  actorId: string | null;
}
