import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAiClient } from '@hireflow/ai';
import type { EnvConfig } from '../config/env.config.js';
import { AI_CLIENT } from './ai.constant.js';
import { AiRepository } from './ai.repository.js';
import { AiQueueService } from './ai-queue.service.js';
import { JobAnalysisService } from './job-analysis.service.js';
import { ScreeningResultService } from './screening-result.service.js';

@Global()
@Module({
  providers: [
    {
      provide: AI_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) =>
        createAiClient({
          apiKey: configService.get('GEMINI_API_KEY', { infer: true }),
          models: {
            text: configService.get('GEMINI_MODEL_TEXT', { infer: true }),
            embedding: configService.get('GEMINI_MODEL_EMBEDDING', { infer: true }),
            audio: configService.get('GEMINI_MODEL_AUDIO', { infer: true }),
          },
          logger: new Logger('AI'),
        }),
    },
    AiQueueService,
    AiRepository,
    JobAnalysisService,
    ScreeningResultService,
  ],
  exports: [AI_CLIENT, AiQueueService, JobAnalysisService, ScreeningResultService],
})
export class AiModule {}
