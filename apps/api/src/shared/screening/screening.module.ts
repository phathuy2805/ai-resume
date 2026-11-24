import { Module } from '@nestjs/common';
import { ScreeningPipelineService } from './screening-pipeline.service.js';
import { ScreeningRecoveryService } from './screening-recovery.service.js';
import { ScreeningListener } from './screening.listener.js';
import { ScreeningRepository } from './screening.repository.js';

/** Pipeline chấm CV chạy nền (W2-BE-01). AiModule và SharedModule là @Global nên không cần import. */
@Module({
  providers: [
    ScreeningRepository,
    ScreeningPipelineService,
    ScreeningListener,
    ScreeningRecoveryService,
  ],
  exports: [ScreeningPipelineService],
})
export class ScreeningModule {}
