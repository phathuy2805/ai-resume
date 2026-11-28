export const INTERVIEW_NAMESPACE = '/interview';

export const INTERVIEW_EVENTS = {
  JOIN: 'interview:join',
  START: 'interview:start',
  ANSWER: 'interview:answer',

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
  AUDIO_NOT_UPLOADED: 'AUDIO_NOT_UPLOADED',
  QUESTION_GENERATION_FAILED: 'QUESTION_GENERATION_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type InterviewErrorCode = (typeof INTERVIEW_ERROR_CODES)[keyof typeof INTERVIEW_ERROR_CODES];

export const INTERVIEW_PHASES = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  EXPIRED: 'EXPIRED',
} as const;

export type InterviewPhase = (typeof INTERVIEW_PHASES)[keyof typeof INTERVIEW_PHASES];

export const TRANSCRIPT_STATUS = {
  NONE: 'NONE',
  TRANSCRIBING: 'TRANSCRIBING',
  READY: 'READY',
  DELAYED: 'DELAYED',
} as const;

export type TranscriptStatus = (typeof TRANSCRIPT_STATUS)[keyof typeof TRANSCRIPT_STATUS];

export const INTERVIEW_INVITE_TTL_DAYS = 7;
export const INTERVIEW_INVITE_TTL_MS = INTERVIEW_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;
export const INTERVIEW_SESSION_TTL_HOURS = 24;
export const INTERVIEW_SESSION_TTL_MS = INTERVIEW_SESSION_TTL_HOURS * 60 * 60 * 1000;

export const INTERVIEW_COMPLETED_EVENT = 'interview.completed';
export const INTERVIEW_AI_QUEUE_PRIORITY = 10;
export const MAX_ANSWER_TEXT_LENGTH = 3000;
export const QUESTION_PLANNER = Symbol('QUESTION_PLANNER');
