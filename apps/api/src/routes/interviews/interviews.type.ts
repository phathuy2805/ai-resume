import type { Socket } from 'socket.io';
import type { AnswerSource } from '../../generated/prisma/client.js';
import type { ApplicationStatus } from '../../shared/constants/application-status.enum.js';
import type { AuthenticatedUser } from '../../shared/types/auth.type.js';
import type { InterviewErrorCode, TranscriptStatus } from './interviews.constant.js';

export interface InterviewQuestionPayload {
  turnId: string;
  order: number;
  total: number;
  text: string;
}

export interface InterviewAnsweredTurnPayload {
  turnId: string;
  order: number;
  question: string;
  answerText: string | null;
  source: AnswerSource;
  answeredAt: string;
}

export interface InterviewStatePayload {
  interviewId: string;
  status: ApplicationStatus;
  expiresAt: string | null;
  isExpired: boolean;
  recordingConsentAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  transcriptStatus: TranscriptStatus;
  processingDelayed: boolean;
  totalQuestions: number;
  currentQuestion: InterviewQuestionPayload | null;
  answeredTurns: InterviewAnsweredTurnPayload[];
}

export interface InterviewPreparingPayload {
  interviewId: string;
  message: string;
}

export interface InterviewCompletedPayload {
  interviewId: string;
  completedAt: string;
  transcriptStatus: TranscriptStatus;
}

export interface InterviewErrorPayload {
  code: InterviewErrorCode;
  message: string;
}

export interface InterviewCompletedEventPayload {
  interviewId: string;
  applicationId: string;
  jobId: string;
  candidateId: string;
  completedAt: Date;
}

export interface PlannedQuestion {
  question: string;
  questionType: string | null;
  targetSkill: string | null;
}

export interface QuestionPlanInput {
  jobTitle: string;
  requiredSkills: string[];
  preferredSkills: string[];
  parsedJd: unknown;
  parsedCv: unknown;
  questionCount: number;
  missingSkills: string[];
}

export interface QuestionPlanner {
  generateQuestionPlan(input: QuestionPlanInput): Promise<PlannedQuestion[]>;
}

export interface InterviewSocketData {
  user: AuthenticatedUser;
  interviewId?: string;
}

export type InterviewSocket = Socket<
  Record<string, (...args: unknown[]) => void>,
  Record<string, (...args: unknown[]) => void>,
  Record<string, (...args: unknown[]) => void>,
  InterviewSocketData
>;

export interface StartInterviewResult {
  firstQuestion: InterviewQuestionPayload;
}

export type SubmitAnswerResult =
  | { kind: 'DUPLICATE'; state: InterviewStatePayload }
  | { kind: 'NEXT_QUESTION'; question: InterviewQuestionPayload }
  | { kind: 'COMPLETED'; completed: InterviewCompletedPayload };
