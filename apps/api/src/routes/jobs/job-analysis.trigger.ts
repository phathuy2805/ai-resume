import { Injectable, Logger } from '@nestjs/common';
import { JobAnalysisService } from '../../shared/ai/job-analysis.service.js';

@Injectable()
export class JobAnalysisTrigger {
  private readonly logger = new Logger(JobAnalysisTrigger.name);

  constructor(private readonly jobAnalysisService: JobAnalysisService) {}

  /**
   * Đưa tác vụ phân tích JD (`parseJd` + `embedJd`) vào `AiQueueService` chạy nền.
   * API tạo/sửa job trả về ngay; lỗi nền được ghi log để lần chấm CV sau thử lại.
   */
  enqueue(jobId: string): void {
    void this.jobAnalysisService.enqueueAnalyzeJob(jobId, { force: true }).catch((error) => {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Phân tích JD nền thất bại cho job ${jobId}: ${reason}`);
    });
  }
}
