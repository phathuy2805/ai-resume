import { Injectable } from '@nestjs/common';

@Injectable()
export class JobAnalysisTrigger {
  /**
   * Điểm gắn kết cho W2-BE-02 (AiQueueService).
   * Ở Tuần 1 là no-op để tách biệt hoàn toàn với pipeline AI Tuần 2.
   */
  enqueue(_jobId: string): void {
    // No-op in W1-BE-04
  }
}
