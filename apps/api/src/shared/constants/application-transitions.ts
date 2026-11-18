import { ApplicationStatus } from './application-status.enum.js';

export const ALLOWED_APPLICATION_TRANSITIONS: Readonly<
  Record<ApplicationStatus, readonly ApplicationStatus[]>
> = {
  [ApplicationStatus.SUBMITTED]: [ApplicationStatus.SCREENING],
  [ApplicationStatus.SCREENING]: [
    ApplicationStatus.SCREENED,
    ApplicationStatus.SCREENING_FAILED,
  ],
  [ApplicationStatus.SCREENING_FAILED]: [ApplicationStatus.SCREENING],
  [ApplicationStatus.SCREENED]: [
    ApplicationStatus.SCREENING,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.SHORTLISTED]: [ApplicationStatus.INTERVIEW_INVITED],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.INTERVIEW_INVITED]: [ApplicationStatus.INTERVIEWING],
  [ApplicationStatus.INTERVIEWING]: [ApplicationStatus.EVALUATED],
  [ApplicationStatus.EVALUATED]: [
    ApplicationStatus.PASSED,
    ApplicationStatus.FAILED,
  ],
  [ApplicationStatus.PASSED]: [],
  [ApplicationStatus.FAILED]: [],
};

export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return ALLOWED_APPLICATION_TRANSITIONS[from].includes(to);
}
