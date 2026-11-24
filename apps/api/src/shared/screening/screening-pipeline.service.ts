import { Inject, Injectable, Logger } from '@nestjs/common';
import { screenCv, type AiClient, type ScreeningOutput } from '@hireflow/ai';
import { AI_CLIENT } from '../ai/ai.constant.js';
import { AiQueueService } from '../ai/ai-queue.service.js';
import { JobAnalysisService } from '../ai/job-analysis.service.js';
import { ScreeningResultService } from '../ai/screening-result.service.js';
import { ApplicationStatus } from '../constants/application-status.enum.js';
import { ApplicationStateService } from '../services/application-state.service.js';
import {
  SCREENABLE_STATUSES,
  SCREENING_MAX_ATTEMPTS,
  SCREENING_RETRY_DELAY_MS,
} from './screening.constant.js';
import { ScreeningPipelineError, type ScreeningPipelineStep } from './screening.error.js';
import { ScreeningRepository } from './screening.repository.js';

/**
 * Pipeline chấm CV chạy nền (W2-BE-01):
 * (SUBMITTED → SCREENING) → ensureJobAnalyzed → screenCv → saveScreeningResult → SCREENED.
 *
 * Pipeline KHÔNG nằm trong `AiQueueService`: `ensureJobAnalyzed` tự xếp việc vào hàng đợi đó,
 * bọc cả pipeline sẽ deadlock khi mọi slot đều đang chờ phân tích JD. Chỉ lời gọi `screenCv`
 * đi qua hàng đợi nên số lời gọi Gemini song song vẫn bị giới hạn.
 */
@Injectable()
export class ScreeningPipelineService {
  private readonly logger = new Logger(ScreeningPipelineService.name);
  private readonly inFlight = new Map<string, Promise<void>>();
  private readonly rerunRequested = new Set<string>();

  constructor(
    @Inject(AI_CLIENT) private readonly aiClient: AiClient,
    private readonly aiQueue: AiQueueService,
    private readonly jobAnalysis: JobAnalysisService,
    private readonly screeningResult: ScreeningResultService,
    private readonly stateService: ApplicationStateService,
    private readonly screeningRepo: ScreeningRepository,
  ) {}

  /**
   * Đưa hồ sơ vào pipeline (fire-and-forget, không bao giờ throw).
   * Hồ sơ đang chạy thì đánh dấu chạy thêm 1 lượt sau khi lượt hiện tại xong,
   * để không bỏ sót trường hợp HR bấm chấm lại đúng lúc lượt cũ vừa kết thúc.
   */
  enqueue(applicationId: string): void {
    void this.schedule(applicationId);
  }

  /** Promise của lượt đang chạy cho hồ sơ (nếu có). Dùng trong test và khi cần chờ. */
  whenIdle(applicationId: string): Promise<void> {
    return this.inFlight.get(applicationId) ?? Promise.resolve();
  }

  /**
   * HR bấm chấm lại: chuyển SCREENING + xóa `screeningError` trong 1 transaction, phát sự kiện, rồi đưa vào pipeline.
   * Ném `ConflictException` (từ state machine) nếu hồ sơ không ở SCREENED / SCREENING_FAILED.
   */
  async rescreen(applicationId: string, hrId: string): Promise<void> {
    const event = await this.screeningRepo.startRescreen(applicationId, hrId);
    this.stateService.emitStatusChanged(event);
    this.enqueue(applicationId);
  }

  private schedule(applicationId: string): Promise<void> {
    const existing = this.inFlight.get(applicationId);
    if (existing) {
      this.rerunRequested.add(applicationId);
      return existing;
    }

    const promise = this.run(applicationId)
      .catch((error: unknown) => {
        this.logger.error(`app=${applicationId} lỗi ngoài dự kiến: ${errorMessage(error)}`);
      })
      .finally(() => {
        this.inFlight.delete(applicationId);
        if (this.rerunRequested.delete(applicationId)) {
          this.enqueue(applicationId);
        }
      });
    this.inFlight.set(applicationId, promise);
    return promise;
  }

  /** Chạy pipeline, lỗi thì chạy lại cả pipeline; hết lượt vẫn lỗi thì chuyển SCREENING_FAILED. */
  private async run(applicationId: string): Promise<void> {
    let lastError: ScreeningPipelineError | undefined;

    for (let attempt = 1; attempt <= SCREENING_MAX_ATTEMPTS; attempt++) {
      try {
        await this.runOnce(applicationId, attempt);
        return;
      } catch (error) {
        lastError = ScreeningPipelineError.wrap('LOAD', error);
        this.logger.warn(
          `app=${applicationId} attempt=${attempt}/${SCREENING_MAX_ATTEMPTS} lỗi ${lastError.message}`,
        );
        if (attempt < SCREENING_MAX_ATTEMPTS) {
          await this.wait(SCREENING_RETRY_DELAY_MS);
        }
      }
    }

    if (lastError) {
      await this.markFailed(applicationId, lastError);
    }
  }

  private async runOnce(applicationId: string, attempt: number): Promise<void> {
    const startedAt = performance.now();
    const ms: Record<string, number> = {};

    const application = await this.step('LOAD', ms, 'loadMs', () =>
      this.screeningRepo.findForScreening(applicationId),
    );
    if (!application) {
      this.logger.warn(`app=${applicationId} bỏ qua: không tìm thấy hồ sơ`);
      return;
    }
    const status = application.status as ApplicationStatus;
    if (!SCREENABLE_STATUSES.includes(status)) {
      this.logger.log(`app=${applicationId} bỏ qua: trạng thái ${status} không cần chấm`);
      return;
    }
    const cvText = application.cvText;
    if (!cvText?.trim()) {
      throw new ScreeningPipelineError('LOAD', 'Hồ sơ không có cvText đã lưu lúc nộp');
    }

    // Hồ sơ chấm lại / khôi phục đã ở SCREENING: gọi transition sẽ bị 409 nên bỏ qua.
    if (status === ApplicationStatus.SUBMITTED) {
      await this.step('TRANSITION', ms, 'toScreeningMs', () =>
        this.stateService.transition(applicationId, ApplicationStatus.SCREENING),
      );
    }

    const job = await this.step('JOB_ANALYSIS', ms, 'jobMs', () =>
      this.jobAnalysis.ensureJobAnalyzed(application.jobId),
    );

    const output = await this.step('PARSE', ms, 'screenCvMs', () =>
      this.aiQueue.add<ScreeningOutput>(() =>
        screenCv(
          this.aiClient,
          { cvText, parsedJd: job.parsedJd, jdEmbedding: job.embedding },
          { logger: this.logger },
        ),
      ),
    );

    const saved = await this.step('SAVE', ms, 'saveMs', () =>
      this.screeningResult.saveScreeningResult(applicationId, output),
    );

    await this.step('TRANSITION', ms, 'toScreenedMs', () =>
      this.stateService.transition(applicationId, ApplicationStatus.SCREENED),
    );

    const { parseCvMs, embedMs, scoreMs, explainMs } = output.timings;
    const totalMs = Math.round(performance.now() - startedAt);
    this.logger.log(
      `app=${applicationId} attempt=${attempt} SCREENED score=${saved.totalScore} rec=${saved.aiRecommendation} ` +
        `loadMs=${ms.loadMs} toScreeningMs=${ms.toScreeningMs ?? 0} jobMs=${ms.jobMs} ` +
        `parseMs=${parseCvMs} embedMs=${embedMs} scoreMs=${scoreMs} explainMs=${explainMs} ` +
        `saveMs=${ms.saveMs} toScreenedMs=${ms.toScreenedMs} totalMs=${totalMs}`,
    );
  }

  /** Chạy một bước, đo thời gian và bọc lỗi kèm tên bước. */
  private async step<T>(
    step: ScreeningPipelineStep,
    ms: Record<string, number>,
    key: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const startedAt = performance.now();
    try {
      return await fn();
    } catch (error) {
      throw ScreeningPipelineError.wrap(step, error);
    } finally {
      ms[key] = Math.round(performance.now() - startedAt);
    }
  }

  private async markFailed(applicationId: string, error: ScreeningPipelineError): Promise<void> {
    try {
      const event = await this.screeningRepo.markFailed(applicationId, error.message);
      this.stateService.emitStatusChanged(event);
      this.logger.error(`app=${applicationId} SCREENING_FAILED step=${error.step}`);
    } catch (markError) {
      // VD lỗi ngay ở bước SUBMITTED → SCREENING: hồ sơ vẫn SUBMITTED, lần khởi động sau sẽ khôi phục.
      this.logger.error(
        `app=${applicationId} không chuyển được SCREENING_FAILED (step=${error.step}): ${errorMessage(markError)}`,
      );
    }
  }

  /** Tách riêng để test thay bằng hàm không chờ. */
  protected wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
