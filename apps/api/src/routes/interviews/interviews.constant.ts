export const INTERVIEW_NAMESPACE = '/interview';

export const INTERVIEW_EVENTS = {
  // Client -> Server
  JOIN: 'interview:join',
  START: 'interview:start',
  ANSWER: 'interview:answer',

  // Server -> Client
  STATE: 'interview:state',
  PREPARING: 'interview:preparing',
  QUESTION: 'interview:question',
  COMPLETED: 'interview:completed',
  ERROR: 'interview:error',
} as const;

export const INTERVIEW_AUTH_ERRORS = {
  EXPIRED: 'AUTH_EXPIRED',
  INVALID: 'AUTH_INVALID',
} as const;

export type InterviewAuthErrorCode =
  (typeof INTERVIEW_AUTH_ERRORS)[keyof typeof INTERVIEW_AUTH_ERRORS];

export const INTERVIEW_ERROR_CODES = {
  NOT_JOINED: 'NOT_JOINED',
  INTERVIEW_NOT_FOUND: 'INTERVIEW_NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  INTERVIEW_EXPIRED: 'INTERVIEW_EXPIRED',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  INVALID_STATE: 'INVALID_STATE',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  QUESTION_GENERATION_FAILED: 'QUESTION_GENERATION_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type InterviewErrorCode = (typeof INTERVIEW_ERROR_CODES)[keyof typeof INTERVIEW_ERROR_CODES];

export const TRANSCRIPT_STATUS = {
  NONE: 'NONE',
  TRANSCRIBING: 'TRANSCRIBING',
  READY: 'READY',
  DELAYED: 'DELAYED',
} as const;

export type TranscriptStatus = (typeof TRANSCRIPT_STATUS)[keyof typeof TRANSCRIPT_STATUS];

export const INTERVIEW_COMPLETED_EVENT = 'interview.completed';
export const INTERVIEW_AI_QUEUE_PRIORITY = 10;
export const MAX_ANSWER_TEXT_LENGTH = 3000;
export const QUESTION_PLANNER = Symbol('QUESTION_PLANNER');
