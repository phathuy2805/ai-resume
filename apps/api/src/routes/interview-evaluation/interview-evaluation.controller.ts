import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Role } from '../../shared/constants/auth.constant.js';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { Roles } from '../../shared/decorators/roles.decorator.js';
import {
  ApiDecideInterviewDoc,
  ApiGetApplicationInterviewDoc,
  ApiGetCandidateFeedbackDoc,
  ApiInterviewEvaluationController,
  ApiReEvaluateInterviewDoc,
} from './interview-evaluation.docs.js';
import {
  GetApplicationInterviewResDto,
  GetCandidateFeedbackResDto,
  InterviewApplicationIdParamDto,
  InterviewDecisionBodyDto,
  InterviewDecisionResDto,
  InterviewIdParamDto,
  ReEvaluateInterviewResDto,
} from './interview-evaluation.dto.js';
import { InterviewEvaluationService } from './interview-evaluation.service.js';

@ApiInterviewEvaluationController()
@Controller()
export class InterviewEvaluationController {
  constructor(private readonly interviewEvaluationService: InterviewEvaluationService) {}

  @Roles(Role.HR)
  @Get('applications/:id/interview')
  @ApiGetApplicationInterviewDoc()
  async getApplicationInterview(
    @CurrentUser('id') hrId: string,
    @Param() params: InterviewApplicationIdParamDto,
  ): Promise<GetApplicationInterviewResDto> {
    return this.interviewEvaluationService.getApplicationInterviewForHr(hrId, params.id);
  }

  @Roles(Role.HR)
  @Post('applications/:id/interview-decision')
  @HttpCode(HttpStatus.OK)
  @ApiDecideInterviewDoc()
  async decideInterview(
    @CurrentUser('id') hrId: string,
    @Param() params: InterviewApplicationIdParamDto,
    @Body() body: InterviewDecisionBodyDto,
  ): Promise<InterviewDecisionResDto> {
    return this.interviewEvaluationService.decideInterview(hrId, params.id, body);
  }

  @Roles(Role.HR)
  @Post('interviews/:id/re-evaluate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiReEvaluateInterviewDoc()
  async reEvaluateInterview(
    @CurrentUser('id') hrId: string,
    @Param() params: InterviewIdParamDto,
  ): Promise<ReEvaluateInterviewResDto> {
    return this.interviewEvaluationService.reEvaluateInterview(hrId, params.id);
  }

  @Roles(Role.CANDIDATE)
  @Get('me/applications/:id/feedback')
  @ApiGetCandidateFeedbackDoc()
  async getCandidateFeedback(
    @CurrentUser('id') candidateId: string,
    @Param() params: InterviewApplicationIdParamDto,
  ): Promise<GetCandidateFeedbackResDto> {
    return this.interviewEvaluationService.getCandidateFeedback(candidateId, params.id);
  }
}
