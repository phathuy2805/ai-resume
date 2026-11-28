import { Inject, Injectable } from '@nestjs/common';
import type { AiClient } from '@hireflow/ai';
import { z } from 'zod';
import { AnswerSource, TurnTranscriptStatus } from '../../generated/prisma/client.js';
import { AI_CLIENT } from '../../shared/ai/ai.constant.js';
import type { RubricWeightsModel } from '../../shared/models/job.model.js';
import { PrismaService } from '../../shared/services/prisma.service.js';
import {
  CandidateFeedbackSchema,
  EvidenceQuotesSchema,
  type CandidateFeedbackType,
  type EvidenceQuotesType,
} from './interview-evaluation.schema.js';
import { isTurnAnswerEmpty } from './interview-transcript.util.js';

export interface TranscribeSessionOptions {
  retryFailedOnly?: boolean;
}

export interface TranscribeSessionResult {
  processedCount: number;
  failedTurnIds: string[];
}

export interface InterviewTranscriber {
  transcribeSession(
    interviewId: string,
    options?: TranscribeSessionOptions,
  ): Promise<TranscribeSessionResult>;
}

export interface EvaluateInterviewTurnInput {
  orderIndex: number;
  question: string;
  questionType: string | null;
  targetSkill: string | null;
  answerText: string | null;
  source: AnswerSource;
  isEmpty: boolean;
}

export interface EvaluateInterviewInput {
  jobTitle: string;
  requiredSkills: string[];
  parsedJd: unknown;
  rubricWeights: RubricWeightsModel;
  screeningResult: {
    totalScore: number;
    breakdown: unknown;
    explanation: unknown;
  } | null;
  turns: EvaluateInterviewTurnInput[];
}

export interface EvaluateInterviewOutput {
  technicalScore: number;
  communicationScore: number;
  relevanceScore: number;
  evidenceScore: number;
  feedbackSummary: string;
  evidenceQuotes: EvidenceQuotesType;
  candidateFeedback: CandidateFeedbackType;
}

export interface InterviewEvaluator {
  evaluateInterview(input: EvaluateInterviewInput): Promise<EvaluateInterviewOutput>;
}

const AiEvaluationResponseSchema = z.object({
  technicalScore: z.number().min(0).max(100),
  communicationScore: z.number().min(0).max(100),
  relevanceScore: z.number().min(0).max(100),
  evidenceScore: z.number().min(0).max(100),
  feedbackSummary: z.string().min(1),
  evidenceQuotes: EvidenceQuotesSchema,
  candidateFeedback: CandidateFeedbackSchema,
});

const EVALUATION_SYSTEM_INSTRUCTION = `Bạn là chuyên gia đánh giá phỏng vấn kỹ thuật khách quan bằng tiếng Việt.
Chấm điểm buổi phỏng vấn theo đúng 4 tiêu chí (thang 0–100):
- technicalScore: độ chính xác và chiều sâu chuyên môn kỹ thuật theo JD.
- communicationScore: độ rõ ràng, mạch lạc trong cách diễn đạt (không phạt lỗi chính tả/dấu câu do nhận dạng giọng nói ở câu VOICE).
- relevanceScore: mức độ trả lời đúng trọng tâm câu hỏi và yêu cầu vị trí.
- evidenceScore: có dẫn chứng thực tế từ dự án, số liệu, tình huống thật hay chỉ nói lý thuyết chung chung.
Quy tắc:
- Câu bị bỏ trống (isEmpty = true) coi như không có câu trả lời và ảnh hưởng tiêu cực đến điểm tương ứng.
- evidenceQuotes: trích dẫn ngắn từ chính lời trả lời của ứng viên cho từng tiêu chí kèm nhận xét ngắn bằng tiếng Việt.
- feedbackSummary: 2–3 câu nhận xét tổng quan nội bộ cho HR (trung lập, gọi ứng viên là "ứng viên").
- candidateFeedback: góp ý mang tính xây dựng gửi ứng viên (strengths, improvements, suggestions), KHÔNG nhắc đến điểm số, ngưỡng điểm hay đề xuất PASS/REJECT.`;

@Injectable()
export class DefaultInterviewTranscriberService implements InterviewTranscriber {
  constructor(private readonly prisma: PrismaService) {}

  async transcribeSession(
    interviewId: string,
    options: TranscribeSessionOptions = {},
  ): Promise<TranscribeSessionResult> {
    const turns = await this.prisma.interviewTurn.findMany({
      where: { interviewId },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        source: true,
        audioS3Key: true,
        answerText: true,
        transcriptStatus: true,
      },
    });

    let processedCount = 0;

    for (const turn of turns) {
      if (turn.source === AnswerSource.TEXT) {
        if (turn.transcriptStatus === null) {
          await this.prisma.interviewTurn.update({
            where: { id: turn.id },
            data: { transcriptStatus: TurnTranscriptStatus.DONE },
          });
        }
        continue;
      }

      if (options.retryFailedOnly && turn.transcriptStatus !== TurnTranscriptStatus.FAILED) {
        continue;
      }

      if (!options.retryFailedOnly && turn.transcriptStatus === TurnTranscriptStatus.DONE) {
        continue;
      }

      if (turn.answerText && turn.answerText.trim().length > 0) {
        await this.prisma.interviewTurn.update({
          where: { id: turn.id },
          data: { transcriptStatus: TurnTranscriptStatus.DONE },
        });
        processedCount += 1;
        continue;
      }

      if (!turn.audioS3Key) {
        await this.prisma.interviewTurn.update({
          where: { id: turn.id },
          data: {
            transcriptStatus: TurnTranscriptStatus.NO_SPEECH,
            answerText: null,
          },
        });
        processedCount += 1;
        continue;
      }

      await this.prisma.interviewTurn.update({
        where: { id: turn.id },
        data: {
          transcriptStatus: TurnTranscriptStatus.NO_SPEECH,
          answerText: null,
        },
      });
      processedCount += 1;
    }

    return {
      processedCount,
      failedTurnIds: [],
    };
  }
}

@Injectable()
export class DefaultInterviewEvaluatorService implements InterviewEvaluator {
  constructor(
    @Inject(AI_CLIENT)
    private readonly aiClient: AiClient,
  ) {}

  async evaluateInterview(input: EvaluateInterviewInput): Promise<EvaluateInterviewOutput> {
    const transcriptLines = input.turns
      .map((turn) => {
        const answer = turn.isEmpty ? '(Bỏ trống / không có lời thoại)' : turn.answerText!.trim();
        return [
          `Câu ${turn.orderIndex} [${turn.source}]${turn.targetSkill ? ` (Kỹ năng: ${turn.targetSkill})` : ''}: ${turn.question}`,
          `Trả lời: ${answer}`,
        ].join('\n');
      })
      .join('\n\n');

    const prompt = [
      `Vị trí tuyển dụng: ${input.jobTitle}`,
      `Kỹ năng bắt buộc: ${input.requiredSkills.join(', ') || 'Không nêu rõ'}`,
      `Trọng số rubric (%): technical=${input.rubricWeights.technical}, communication=${input.rubricWeights.communication}, relevance=${input.rubricWeights.relevance}, evidence=${input.rubricWeights.evidence}`,
      input.parsedJd ? `Parsed JD: ${JSON.stringify(input.parsedJd)}` : '',
      input.screeningResult
        ? `Thông tin vòng CV (tham khảo bối cảnh kỹ năng): ${JSON.stringify(input.screeningResult.breakdown)}`
        : '',
      '',
      'NỘI DUNG PHỎNG VẤN:',
      transcriptLines,
    ]
      .filter(Boolean)
      .join('\n');

    const evaluated = await this.aiClient.generateStructured(prompt, AiEvaluationResponseSchema, {
      temperature: 0,
      systemInstruction: EVALUATION_SYSTEM_INSTRUCTION,
    });

    const clampScore = (n: number) => Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;

    return {
      technicalScore: clampScore(evaluated.technicalScore),
      communicationScore: clampScore(evaluated.communicationScore),
      relevanceScore: clampScore(evaluated.relevanceScore),
      evidenceScore: clampScore(evaluated.evidenceScore),
      feedbackSummary: evaluated.feedbackSummary,
      evidenceQuotes: evaluated.evidenceQuotes,
      candidateFeedback: evaluated.candidateFeedback,
    };
  }
}

export function buildTurnEvaluationInputs(
  turns: ReadonlyArray<{
    orderIndex: number;
    question: string;
    questionType: string | null;
    targetSkill: string | null;
    answerText: string | null;
    source: AnswerSource;
    transcriptStatus: TurnTranscriptStatus | null;
  }>,
): EvaluateInterviewTurnInput[] {
  return turns.map((turn) => {
    const empty = isTurnAnswerEmpty(turn);
    return {
      orderIndex: turn.orderIndex,
      question: turn.question,
      questionType: turn.questionType,
      targetSkill: turn.targetSkill,
      answerText: empty ? null : turn.answerText,
      source: turn.source,
      isEmpty: empty,
    };
  });
}
