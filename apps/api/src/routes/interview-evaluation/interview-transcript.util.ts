import { AnswerSource, TurnTranscriptStatus } from '../../generated/prisma/client.js';
import type { RubricWeightsModel } from '../../shared/models/job.model.js';

export interface TranscriptTurnInput {
  orderIndex: number;
  question: string;
  answerText: string | null;
  source: AnswerSource;
  transcriptStatus: TurnTranscriptStatus | null;
}

export function isTurnAnswerEmpty(turn: {
  answerText: string | null;
  transcriptStatus: TurnTranscriptStatus | null;
}): boolean {
  if (turn.transcriptStatus === TurnTranscriptStatus.NO_SPEECH) {
    return true;
  }
  return !turn.answerText || turn.answerText.trim().length === 0;
}

export function buildInterviewTranscriptText(params: {
  interviewId: string;
  jobTitle: string;
  completedAt: Date | null;
  turns: readonly TranscriptTurnInput[];
}): string {
  const header = [
    `HIREFLOW INTERVIEW TRANSCRIPT`,
    `Interview ID: ${params.interviewId}`,
    `Vị trí: ${params.jobTitle}`,
    `Hoàn thành lúc: ${params.completedAt ? params.completedAt.toISOString() : 'N/A'}`,
    '============================================================',
    '',
  ];

  const blocks = params.turns.map((turn) => {
    const empty = isTurnAnswerEmpty(turn);
    const answerLine = empty
      ? turn.transcriptStatus === TurnTranscriptStatus.NO_SPEECH
        ? '(Không ghi nhận được giọng nói — coi như bỏ trống)'
        : '(Ứng viên bỏ trống)'
      : turn.answerText!.trim();

    return [
      `Câu ${turn.orderIndex} [${turn.source}]: ${turn.question}`,
      `Trả lời: ${answerLine}`,
      '',
    ].join('\n');
  });

  return [...header, ...blocks].join('\n').trimEnd() + '\n';
}

export function computeWeightedInterviewScore(
  scores: {
    technicalScore: number;
    communicationScore: number;
    relevanceScore: number;
    evidenceScore: number;
  },
  weights: RubricWeightsModel,
): number {
  const weighted =
    (scores.technicalScore * weights.technical +
      scores.communicationScore * weights.communication +
      scores.relevanceScore * weights.relevance +
      scores.evidenceScore * weights.evidence) /
    100;
  return Math.round(Math.min(100, Math.max(0, weighted)) * 10) / 10;
}
