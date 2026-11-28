import { apiClient } from '@/lib/axios';
import { ApiError, type ApiResponse } from '@/types/api';
import { unwrap } from './response';

export type TranscriptStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface InterviewTranscriptTurn {
  turnId: string;
  order: number;
  question: string;
  answerText: string | null;
  transcriptStatus: TranscriptStatus;
}

export interface InterviewTranscript {
  transcriptStatus: TranscriptStatus;
  turns: InterviewTranscriptTurn[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function mapInterviewTranscript(value: unknown): InterviewTranscript {
  if (
    !isRecord(value) ||
    !['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(value.transcriptStatus as string) ||
    !Array.isArray(value.turns)
  ) {
    throw new ApiError('Response transcript không đúng cấu trúc API.', { kind: 'contract' });
  }

  const turns = value.turns.map((turn): InterviewTranscriptTurn => {
    if (
      !isRecord(turn) ||
      typeof turn.turnId !== 'string' ||
      typeof turn.order !== 'number' ||
      typeof turn.question !== 'string' ||
      (turn.answerText !== null && typeof turn.answerText !== 'string') ||
      !['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(turn.transcriptStatus as string)
    ) {
      throw new ApiError('Một lượt transcript không đúng cấu trúc API.', { kind: 'contract' });
    }

    return {
      turnId: turn.turnId,
      order: turn.order,
      question: turn.question,
      answerText: turn.answerText,
      transcriptStatus: turn.transcriptStatus as TranscriptStatus,
    };
  });

  return {
    transcriptStatus: value.transcriptStatus as TranscriptStatus,
    turns: turns.sort((a, b) => a.order - b.order),
  };
}

export async function getInterviewTranscript(
  interviewId: string,
  signal?: AbortSignal,
): Promise<InterviewTranscript> {
  const response = await apiClient.get<ApiResponse<unknown>>(
    `/me/interviews/${encodeURIComponent(interviewId)}/transcript`,
    { signal },
  );
  return mapInterviewTranscript(unwrap(response.data));
}
