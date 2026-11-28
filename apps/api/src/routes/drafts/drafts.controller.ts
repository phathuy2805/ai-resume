import { Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiDashboardDraftController,
  ApiGetCandidatesRankingDoc,
  ApiGetDashboardOverviewDoc,
  ApiGetScreeningResultDoc,
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
