import { Module } from '@nestjs/common';
import {
  DefaultInterviewEvaluatorService,
  DefaultInterviewTranscriberService,
} from './interview-evaluation.adapters.js';
import { INTERVIEW_EVALUATOR, INTERVIEW_TRANSCRIBER } from './interview-evaluation.constant.js';
import { InterviewEvaluationController } from './interview-evaluation.controller.js';
import { InterviewEvaluationRepository } from './interview-evaluation.repository.js';
import { InterviewEvaluationService } from './interview-evaluation.service.js';
import { InterviewProcessingService } from './interview-processing.service.js';

@Module({
  controllers: [InterviewEvaluationController],
  providers: [
    InterviewEvaluationRepository,
    DefaultInterviewTranscriberService,
    DefaultInterviewEvaluatorService,
    {
      provide: INTERVIEW_TRANSCRIBER,
      useExisting: DefaultInterviewTranscriberService,
    },
    {
      provide: INTERVIEW_EVALUATOR,
      useExisting: DefaultInterviewEvaluatorService,
    },
    InterviewProcessingService,
    InterviewEvaluationService,
  ],
  exports: [InterviewProcessingService, InterviewEvaluationService],
})
export class InterviewEvaluationModule {}
