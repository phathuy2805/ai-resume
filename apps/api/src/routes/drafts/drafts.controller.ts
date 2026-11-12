import { Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiCompleteInterviewDoc,
  ApiCreateInterviewSessionDoc,
  ApiDashboardDraftController,
  ApiGetCandidatesRankingDoc,
  ApiGetDashboardOverviewDoc,
  ApiGetInterviewReportDoc,
  ApiGetNextInterviewTurnDoc,
  ApiGetScreeningResultDoc,
  ApiInterviewDraftController,
  ApiScreeningDraftController,
  ApiTriggerScreeningDoc,
} from './drafts.docs.js';

@ApiScreeningDraftController()
@Controller('screening')
export class ScreeningDraftController {
  @Post('trigger/:applicationId')
  @ApiTriggerScreeningDoc()
  triggerScreening(@Param('applicationId') applicationId: string) {
    return { message: 'Screening task triggered', applicationId };
  }

  @Get('result/:applicationId')
  @ApiGetScreeningResultDoc()
  getScreeningResult(@Param('applicationId') applicationId: string) {
    return { message: 'Screening result details', applicationId };
  }
}

@ApiInterviewDraftController()
@Controller('interviews')
export class InterviewDraftController {
  @Post('session/:applicationId')
  @ApiCreateInterviewSessionDoc()
  createSession(@Param('applicationId') applicationId: string) {
    return { message: 'Interview session created', applicationId };
  }

  @Get('session/:interviewId/turn')
  @ApiGetNextInterviewTurnDoc()
  getNextTurn(@Param('interviewId') interviewId: string) {
    return { message: 'Next interview turn question', interviewId };
  }

  @Post('complete/:interviewId')
  @ApiCompleteInterviewDoc()
  completeInterview(@Param('interviewId') interviewId: string) {
    return { message: 'Interview completed and evaluating', interviewId };
  }

  @Get('report/:interviewId')
  @ApiGetInterviewReportDoc()
  getInterviewReport(@Param('interviewId') interviewId: string) {
    return { message: 'Interview evaluation report', interviewId };
  }
}

@ApiDashboardDraftController()
@Controller('dashboard')
export class DashboardDraftController {
  @Get('overview')
  @ApiGetDashboardOverviewDoc()
  getOverview() {
    return { message: 'Dashboard overview statistics' };
  }

  @Get('candidates-ranking/:jobId')
  @ApiGetCandidatesRankingDoc()
  getCandidatesRanking(@Param('jobId') jobId: string) {
    return { message: 'Candidates ranking for job', jobId };
  }
}
