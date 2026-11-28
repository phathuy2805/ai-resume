import { describe, expect, it } from 'vitest';
import { interviewTranscriptRefetchInterval } from './useInterviewTranscript';

describe('interviewTranscriptRefetchInterval', () => {
  it.each(['PENDING', 'PROCESSING'] as const)('polls every five seconds for %s', (status) => {
    expect(interviewTranscriptRefetchInterval(status)).toBe(5000);
  });

  it.each(['COMPLETED', 'FAILED', undefined] as const)(
    'does not poll for terminal or unknown status %s',
    (status) => {
      expect(interviewTranscriptRefetchInterval(status)).toBe(false);
    },
  );
});
