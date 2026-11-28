import { ApplicationStatus } from '../../shared/constants/application-status.enum.js';
import {
  INTERVIEW_INVITE_TTL_MS,
  INTERVIEW_PHASES,
  INTERVIEW_SESSION_TTL_MS,
  type InterviewPhase,
} from './interviews.constant.js';

export interface InterviewTimingFields {
  createdAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  expiresAt?: Date | null;
}

const SUBMITTED_APPLICATION_STATUSES = new Set<ApplicationStatus>([
  ApplicationStatus.EVALUATED,
  ApplicationStatus.PASSED,
  ApplicationStatus.FAILED,
]);

export function computeInviteExpiresAt(interview: {
  createdAt: Date;
  expiresAt?: Date | null;
}): Date {
  if (interview.expiresAt) {
    return interview.expiresAt;
  }
  return new Date(interview.createdAt.getTime() + INTERVIEW_INVITE_TTL_MS);
}

export function computeSessionExpiresAt(interview: {
  startedAt?: Date | null;
}): Date | null {
  if (!interview.startedAt) {
    return null;
  }
  return new Date(interview.startedAt.getTime() + INTERVIEW_SESSION_TTL_MS);
}

export function isInviteExpired(interview: InterviewTimingFields, now = new Date()): boolean {
  if (interview.startedAt || interview.completedAt) {
    return false;
  }
  return now.getTime() >= computeInviteExpiresAt(interview).getTime();
}

export function isSessionDeadlinePassed(
  interview: InterviewTimingFields,
  now = new Date(),
): boolean {
  const sessionExpiresAt = computeSessionExpiresAt(interview);
  if (!sessionExpiresAt || interview.completedAt) {
    return false;
  }
  return now.getTime() >= sessionExpiresAt.getTime();
}

export function computeInterviewPhase(
  interview: InterviewTimingFields,
  status: ApplicationStatus,
  now = new Date(),
): InterviewPhase {
  if (interview.completedAt || SUBMITTED_APPLICATION_STATUSES.has(status)) {
    return INTERVIEW_PHASES.SUBMITTED;
  }
  if (interview.startedAt) {
    return isSessionDeadlinePassed(interview, now)
      ? INTERVIEW_PHASES.SUBMITTED
      : INTERVIEW_PHASES.IN_PROGRESS;
  }
  return isInviteExpired(interview, now)
    ? INTERVIEW_PHASES.EXPIRED
    : INTERVIEW_PHASES.NOT_STARTED;
}
