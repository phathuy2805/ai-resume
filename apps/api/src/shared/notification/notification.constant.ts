import { ApplicationStatus } from '../constants/application-status.enum.js';

export const DEMO_EMAIL_DOMAIN = '@example.com';
export const DEFAULT_MAIL_RETRY_DELAY_MS = 1000;
export const DEFAULT_INTERVIEW_DEADLINE_DAYS = 7;
export const INTERVIEW_COMPLETED_EVENT = 'interview.completed';

export const MAIL_SERVICE_OPTIONS = Symbol('MAIL_SERVICE_OPTIONS');

export const NOTIFIABLE_APPLICATION_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  ApplicationStatus.INTERVIEW_INVITED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.PASSED,
  ApplicationStatus.FAILED,
]);
