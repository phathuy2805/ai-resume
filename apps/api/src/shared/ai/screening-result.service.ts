import type { ScreeningOutput } from '@hireflow/ai';
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.config.js';
import { DEFAULT_AI_CONSIDER_MARGIN } from './ai.constant.js';
import { AiRepository } from './ai.repository.js';
import type { SavedScreeningSummary } from './ai.type.js';
import { assertValidEmbeddingVector, computeAiRecommendation } from './ai.util.js';

@Injectable()
export class ScreeningResultService {
  private readonly logger = new Logger(ScreeningResultService.name);
  readonly considerMargin: number;

  constructor(
    private readonly aiRepo: AiRepository,
    @Optional() configService?: ConfigService<EnvConfig, true>,
  ) {
    const configured = configService?.get('AI_CONSIDER_MARGIN', { infer: true });
    this.considerMargin =
      typeof configured === 'number' && Number.isInteger(configured) && configured >= 0
        ? configured
        : DEFAULT_AI_CONSIDER_MARGIN;
  }

  /**
   * Lưu kết quả từ `screenCv()` (`parsedCv`, `cvEmbedding`, `aiRecommendation` và upsert `ScreeningResult`)
   * trong một database transaction nguyên tử.
   */
  async saveScreeningResult(
    applicationId: string,
    output: ScreeningOutput,
  ): Promise<SavedScreeningSummary> {
    assertValidEmbeddingVector(output.cvEmbedding);

    const application = await this.aiRepo.findApplicationForScreening(applicationId);
    if (!application) {
      throw new NotFoundException(`Không tìm thấy hồ sơ ứng tuyển ${applicationId}`);
    }

    const aiRecommendation = computeAiRecommendation(
      output.total,
      application.job.cvPassThreshold,
      this.considerMargin,
    );

    await this.aiRepo.saveScreeningResult({
      applicationId,
      output,
      aiRecommendation,
    });

    this.logger.log(
      `Đã lưu kết quả chấm CV cho application=${applicationId} score=${output.total} recommendation=${aiRecommendation}`,
    );

    return {
      applicationId,
      totalScore: output.total,
      aiRecommendation,
    };
  }
}
