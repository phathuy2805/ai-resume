import { Module } from '@nestjs/common';
import { DashboardDraftController, ScreeningDraftController } from './drafts.controller.js';

@Module({
  controllers: [ScreeningDraftController, DashboardDraftController],
})
export class DraftsModule {}
