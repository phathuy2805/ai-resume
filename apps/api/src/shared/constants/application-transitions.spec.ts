import { describe, expect, it } from 'vitest';
import { ApplicationStatus } from './application-status.enum.js';
import {
  ALLOWED_APPLICATION_TRANSITIONS,
  canTransition,
} from './application-transitions.js';

describe('application-transitions', () => {
  const validTransitions: Array<[ApplicationStatus, ApplicationStatus]> = [
    [ApplicationStatus.SUBMITTED, ApplicationStatus.SCREENING],
    [ApplicationStatus.SCREENING, ApplicationStatus.SCREENED],
    [ApplicationStatus.SCREENING, ApplicationStatus.SCREENING_FAILED],
    [ApplicationStatus.SCREENING_FAILED, ApplicationStatus.SCREENING],
    [ApplicationStatus.SCREENED, ApplicationStatus.SCREENING],
    [ApplicationStatus.SCREENED, ApplicationStatus.SHORTLISTED],
    [ApplicationStatus.SCREENED, ApplicationStatus.REJECTED],
    [ApplicationStatus.SHORTLISTED, ApplicationStatus.INTERVIEW_INVITED],
    [ApplicationStatus.INTERVIEW_INVITED, ApplicationStatus.INTERVIEWING],
    [ApplicationStatus.INTERVIEWING, ApplicationStatus.EVALUATED],
    [ApplicationStatus.EVALUATED, ApplicationStatus.PASSED],
    [ApplicationStatus.EVALUATED, ApplicationStatus.FAILED],
  ];

  it.each(validTransitions)(
    'allows valid transition %s -> %s',
    (from, to) => {
      expect(canTransition(from, to)).toBe(true);
    },
  );

  it('rejects every invalid transition not listed in the transition matrix', () => {
    const allStatuses = Object.values(ApplicationStatus);
    const validSet = new Set(validTransitions.map(([from, to]) => `${from}->${to}`));

    for (const from of allStatuses) {
      for (const to of allStatuses) {
        if (!validSet.has(`${from}->${to}`)) {
          expect(canTransition(from, to)).toBe(false);
        }
      }
    }
  });

  it('explicitly rejects required forbidden transitions', () => {
    expect(
      canTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.PASSED),
    ).toBe(false);
    expect(
      canTransition(ApplicationStatus.REJECTED, ApplicationStatus.SHORTLISTED),
    ).toBe(false);
    expect(
      canTransition(ApplicationStatus.SCREENING, ApplicationStatus.SHORTLISTED),
    ).toBe(false);
  });

  it('defines terminal states with zero outgoing transitions', () => {
    expect(ALLOWED_APPLICATION_TRANSITIONS[ApplicationStatus.REJECTED]).toEqual([]);
    expect(ALLOWED_APPLICATION_TRANSITIONS[ApplicationStatus.PASSED]).toEqual([]);
    expect(ALLOWED_APPLICATION_TRANSITIONS[ApplicationStatus.FAILED]).toEqual([]);
  });
});
