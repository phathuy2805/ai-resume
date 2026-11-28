import { createZodDto } from 'nestjs-zod';
import {
  GetApplicationInterviewResSchema,
  GetCandidateFeedbackResSchema,
  InterviewApplicationIdParamSchema,
  InterviewDecisionBodySchema,
  InterviewDecisionResSchema,
  InterviewIdParamSchema,
  ReEvaluateInterviewResSchema,
} from './interview-evaluation.schema.js';

export class InterviewApplicationIdParamDto extends createZodDto(
  InterviewApplicationIdParamSchema,
) {}
export class InterviewIdParamDto extends createZodDto(InterviewIdParamSchema) {}
export class InterviewDecisionBodyDto extends createZodDto(InterviewDecisionBodySchema) {}

export class GetApplicationInterviewResDto extends createZodDto(GetApplicationInterviewResSchema) {}
export class InterviewDecisionResDto extends createZodDto(InterviewDecisionResSchema) {}
export class ReEvaluateInterviewResDto extends createZodDto(ReEvaluateInterviewResSchema) {}
export class GetCandidateFeedbackResDto extends createZodDto(GetCandidateFeedbackResSchema) {}
