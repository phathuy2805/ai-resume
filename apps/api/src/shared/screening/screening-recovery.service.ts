import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ScreeningPipelineService } from './screening-pipeline.service.js';
import { ScreeningRepository } from './screening.repository.js';

/** Khi server khởi động: đưa lại vào pipeline các hồ sơ bị dở (SUBMITTED / SCREENING) do restart. */
@Injectable()
export class ScreeningRecoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScreeningRecoveryService.name);

  constructor(
    private readonly screeningRepo: ScreeningRepository,
    private readonly pipeline: ScreeningPipelineService,
  ) {}

  /** Không await để không chặn server khởi động. */
  onApplicationBootstrap(): void {
    void this.recover();
  }

  async recover(): Promise<number> {
    try {
      const ids = await this.screeningRepo.findPendingIds();
      for (const id of ids) {
        this.pipeline.enqueue(id);
      }
      if (ids.length > 0) {
        this.logger.log(`Khôi phục ${ids.length} hồ sơ đang chờ chấm sau khi khởi động`);
      }
      return ids.length;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Không khôi phục được hồ sơ đang chờ chấm: ${reason}`);
      return 0;
    }
  }
}
