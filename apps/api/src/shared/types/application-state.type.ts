import type { Prisma } from '../../generated/prisma/client.js';
import type { ApplicationStatusChangedPayload } from '../constants/application-event.constant.js';
import type { ApplicationStatus } from '../constants/application-status.enum.js';

export interface TransitionOptions {
  actorId?: string | null;
  reason?: string | null;
  tx?: Prisma.TransactionClient;
}

export interface TransitionResult {
  applicationId: string;
  jobId: string;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  actorId: string | null;
  event: ApplicationStatusChangedPayload;
}

export interface UpdateStatusWithHistoryInput {
  applicationId: string;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  actorId: string | null;
  reason: string | null;
}

export interface CreateInitialHistoryInput {
  applicationId: string;
  actorId: string | null;
  reason: string | null;
}
