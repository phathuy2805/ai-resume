import { Module } from '@nestjs/common';
import { CompanyModule } from '../company/company.module.js';
import { InterviewGateway } from './interview.gateway.js';
import { QUESTION_PLANNER } from './interviews.constant.js';
import { InterviewsRepository } from './interviews.repository.js';
import { InterviewsService } from './interviews.service.js';
import { AiQuestionPlannerService } from './question-planner.service.js';

@Module({
  imports: [CompanyModule],
  providers: [
    InterviewsRepository,
    AiQuestionPlannerService,
    {
      provide: QUESTION_PLANNER,
      useExisting: AiQuestionPlannerService,
    },
    InterviewsService,
    InterviewGateway,
  ],
  exports: [InterviewsService],
})
export class InterviewsModule {}
