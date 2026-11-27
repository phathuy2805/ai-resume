import type { InterviewErrorCode } from './interviews.constant.js';

export class InterviewWebSocketError extends Error {
  constructor(
    readonly code: InterviewErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'InterviewWebSocketError';
  }
}

export function isInterviewWebSocketError(error: unknown): error is InterviewWebSocketError {
  return error instanceof InterviewWebSocketError;
}
