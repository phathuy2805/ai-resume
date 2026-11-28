import { z } from 'zod';
import { MAX_ANSWER_TEXT_LENGTH } from './interviews.constant.js';

export const InterviewJoinPayloadSchema = z.object({
  interviewId: z.uuid('interviewId không đúng định dạng UUID'),
});

export const InterviewStartPayloadSchema = z.object({
  consent: z.boolean(),
});

const AnswerTextSchema = z
  .string()
  .trim()
  .min(1, 'Nội dung câu trả lời không được để trống')
  .max(MAX_ANSWER_TEXT_LENGTH, `Nội dung câu trả lời tối đa ${MAX_ANSWER_TEXT_LENGTH} ký tự`);

export const InterviewAnswerPayloadSchema = z.discriminatedUnion('source', [
  z.object({
    turnId: z.uuid('turnId không đúng định dạng UUID'),
    source: z.literal('VOICE'),
    audioKey: z.string().trim().min(1, 'Thiếu audioKey cho câu trả lời bằng giọng nói'),
    text: AnswerTextSchema.optional(),
    transcriptEdited: z.boolean().optional().default(false),
  }),
  z.object({
    turnId: z.uuid('turnId không đúng định dạng UUID'),
    source: z.literal('TEXT'),
    text: AnswerTextSchema,
    audioKey: z.string().trim().min(1).optional(),
    transcriptEdited: z.boolean().optional().default(false),
  }),
]);

export type InterviewJoinPayload = z.infer<typeof InterviewJoinPayloadSchema>;
export type InterviewStartPayload = z.infer<typeof InterviewStartPayloadSchema>;
export type InterviewAnswerPayload = z.infer<typeof InterviewAnswerPayloadSchema>;
