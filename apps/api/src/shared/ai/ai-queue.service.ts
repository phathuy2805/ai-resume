import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PQueue from 'p-queue';
import type { EnvConfig } from '../config/env.config.js';
import { DEFAULT_AI_QUEUE_CONCURRENCY } from './ai.constant.js';

@Injectable()
export class AiQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(AiQueueService.name);
  private readonly queue: PQueue;
  readonly concurrency: number;

  constructor(@Optional() configService?: ConfigService<EnvConfig, true>) {
    const configured = configService?.get('AI_QUEUE_CONCURRENCY', { infer: true });
    this.concurrency =
      typeof configured === 'number' && Number.isInteger(configured) && configured >= 1
        ? configured
        : DEFAULT_AI_QUEUE_CONCURRENCY;

    this.queue = new PQueue({ concurrency: this.concurrency });
    this.logger.log(`Khởi tạo hàng đợi AI dùng chung với concurrency=${this.concurrency}`);
  }

  /** Đưa một tác vụ gọi AI vào hàng đợi dùng chung để giới hạn concurrency. */
  async add<T>(task: () => Promise<T>): Promise<T> {
    return this.queue.add(task) as Promise<T>;
  }

  get size(): number {
    return this.queue.size;
  }

  get pending(): number {
    return this.queue.pending;
  }

  onIdle(): Promise<void> {
    return this.queue.onIdle();
  }

  onModuleDestroy(): void {
    this.queue.clear();
  }
}
