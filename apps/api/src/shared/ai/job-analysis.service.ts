import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { embedJd, parseJd, ParsedJdSchema, type AiClient } from '@hireflow/ai';
import { AI_CLIENT } from './ai.constant.js';
import { AiRepository } from './ai.repository.js';
import type { AnalyzedJobResult } from './ai.type.js';
import { parsePgVectorLiteral } from './ai.util.js';
import { AiQueueService } from './ai-queue.service.js';

@Injectable()
export class JobAnalysisService {
  private readonly logger = new Logger(JobAnalysisService.name);
  private readonly inFlight = new Map<string, Promise<AnalyzedJobResult | null>>();
  private readonly queuedByJob = new Map<string, Promise<AnalyzedJobResult | null>>();
  private readonly pendingReanalyze = new Set<string>();

  constructor(
    @Inject(AI_CLIENT) private readonly aiClient: AiClient,
    private readonly aiQueue: AiQueueService,
    private readonly aiRepo: AiRepository,
  ) {}

  /**
   * Đưa phân tích JD vào `AiQueueService`, gộp các lời gọi trùng `jobId` đang chờ/đang chạy.
   * Khi `force: true` (VD: HR vừa sửa JD lúc lượt phân tích cũ đang chạy), đánh dấu chạy thêm 1 lượt mới ngay sau đó.
   */
  enqueueAnalyzeJob(
    jobId: string,
    options: { force?: boolean } = {},
  ): Promise<AnalyzedJobResult | null> {
    const existing = this.queuedByJob.get(jobId);
    if (existing) {
      if (options.force) {
        this.pendingReanalyze.add(jobId);
      }
      return existing;
    }

    const promise = this.aiQueue.add(() => this.analyzeJob(jobId)).finally(() => {
      this.queuedByJob.delete(jobId);
      if (this.pendingReanalyze.delete(jobId)) {
        void this.enqueueAnalyzeJob(jobId).catch((error) => {
          const reason = error instanceof Error ? error.message : String(error);
          this.logger.error(`Phân tích lại JD thất bại cho job ${jobId}: ${reason}`);
        });
      }
    });
    this.queuedByJob.set(jobId, promise);
    return promise;
  }

  /**
   * Chạy `parseJd` + `embedJd` và lưu cả `parsedJd` + `embedding` nguyên tử trong DB.
   * Nếu AI hoặc DB lỗi: ghi log và giữ nguyên `parsedJd = null` để lần chấm CV sau thử lại.
   */
  analyzeJob(jobId: string): Promise<AnalyzedJobResult | null> {
    const existing = this.inFlight.get(jobId);
    if (existing) {
      return existing;
    }

    const promise = this.executeAnalyzeJob(jobId).finally(() => {
      this.inFlight.delete(jobId);
    });
    this.inFlight.set(jobId, promise);
    return promise;
  }

  /**
   * Dùng trước khi chấm CV (`W2-BE-01`): nếu JD đã có `parsedJd` hợp lệ và `embedding`, trả về ngay;
   * nếu thiếu hoặc lệch `schemaVersion`, đưa vào hàng đợi phân tích và chờ hoàn tất.
   */
  async ensureJobAnalyzed(jobId: string): Promise<AnalyzedJobResult> {
    const queued = this.queuedByJob.get(jobId);
    if (queued) {
      const result = await queued;
      if (!result) {
        throw new NotFoundException(`Không tìm thấy tin tuyển dụng ${jobId}`);
      }
      return result;
    }

    const job = await this.aiRepo.findJobForAnalysis(jobId);
    if (!job) {
      throw new NotFoundException(`Không tìm thấy tin tuyển dụng ${jobId}`);
    }

    const parsedCheck = ParsedJdSchema.safeParse(job.parsedJd);
    const existingEmbedding = parsePgVectorLiteral(job.embeddingText);
    if (parsedCheck.success && existingEmbedding) {
      return {
        parsedJd: parsedCheck.data,
        embedding: existingEmbedding,
      };
    }

    const result = await this.enqueueAnalyzeJob(jobId);
    if (!result) {
      throw new NotFoundException(`Không tìm thấy tin tuyển dụng ${jobId}`);
    }
    return result;
  }

  private async executeAnalyzeJob(jobId: string): Promise<AnalyzedJobResult | null> {
    const job = await this.aiRepo.findJobForAnalysis(jobId);
    if (!job) {
      this.logger.warn(`Bỏ qua phân tích JD vì không tìm thấy job ${jobId}`);
      return null;
    }

    try {
      const parsedJd = await parseJd(this.aiClient, {
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        minYearsExperience: job.minYearsExperience,
        level: job.level,
      });

      const embedding = await embedJd(this.aiClient, parsedJd);
      await this.aiRepo.saveJobAnalysis(jobId, parsedJd, embedding);

      this.logger.log(`Phân tích JD thành công cho job ${jobId}`);
      return { parsedJd, embedding };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Phân tích JD thất bại cho job ${jobId}: ${reason}`);
      throw error;
    }
  }
}
