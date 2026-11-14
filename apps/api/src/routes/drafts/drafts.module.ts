import { Module } from '@nestjs/common';
import {
  DashboardDraftController,
  InterviewDraftController,
  ScreeningDraftController,
} from './drafts.controller.js';

@Module({
  controllers: [
    ScreeningDraftController,
    InterviewDraftController,
    DashboardDraftController,
  ],
})
export class DraftsModule {}
