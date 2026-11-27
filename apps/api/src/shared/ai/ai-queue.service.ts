import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.config.js';
import {
  AI_QUEUE_SCHEDULER_OPTIONS,
  DEFAULT_AI_QUEUE_AGING_INTERVAL_MS,
  DEFAULT_AI_QUEUE_AGING_STEP,
  DEFAULT_AI_QUEUE_CONCURRENCY,
} from './ai.constant.js';

/**
 * Hai luồng (lane) công việc trong hàng đợi AI:
 * - `live`: tác vụ tương tác trực tiếp (VD: sinh câu hỏi phỏng vấn khi ứng viên đang chờ).
 * - `background`: tác vụ chạy nền (VD: phân tích JD, chấm CV, batch STT, chấm phỏng vấn).
 */
export type AiQueueLane = 'live' | 'background';

export interface AiQueueTaskOptions {
  /** Điểm ưu tiên nền (số càng lớn càng chạy trước). Mặc định: 0. */
  priority?: number;
  /** Lane của tác vụ để áp dụng Work-conserving Bulkhead. Mặc định: 'background'. */
  lane?: AiQueueLane;
}

export interface AiQueueSchedulerOptions {
  /** Khoảng thời gian chờ (ms) để cộng thêm điểm ưu tiên. Mặc định: 60_000ms (1 phút). */
  agingIntervalMs?: number;
  /** Số điểm ưu tiên cộng thêm sau mỗi chu kỳ agingIntervalMs. Mặc định: 2. */
  agingStep?: number;
  /** Hàm lấy thời gian hiện tại (cho phép inject đồng hồ giả khi viết unit test). */
  now?: () => number;
}

interface QueuedTask {
  task: () => Promise<unknown>;
  priority: number;
  lane: AiQueueLane;
  enqueuedAt: number;
  seq: number;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

/**
 * Hàng đợi AI dùng chung giới hạn concurrency, chống "chết đói" (Priority Starvation) bằng 2 cơ chế:
 * 1. **Priority Aging:** tác vụ chờ càng lâu tự động tăng điểm ưu tiên hiệu dụng theo thời gian.
 * 2. **Work-conserving Bulkhead:** khi `concurrency >= 2` và cả 2 lane đều có việc chờ,
 *    luôn giữ tối thiểu 1 slot cho `background`; khi không có việc nền chờ, `live` dùng trọn 100% slot.
 */
@Injectable()
export class AiQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(AiQueueService.name);
  private readonly waiting: QueuedTask[] = [];
  private readonly activeByLane: Record<AiQueueLane, number> = { live: 0, background: 0 };
  private readonly idleResolvers: Array<() => void> = [];
  private readonly agingIntervalMs: number;
  private readonly agingStep: number;
  private readonly now: () => number;
  private nextSeq = 0;

  readonly concurrency: number;

  constructor(
    @Optional() configService?: ConfigService<EnvConfig, true>,
    @Optional()
    @Inject(AI_QUEUE_SCHEDULER_OPTIONS)
    schedulerOptions?: AiQueueSchedulerOptions,
  ) {
    const configured = configService?.get('AI_QUEUE_CONCURRENCY', { infer: true });
    this.concurrency =
      typeof configured === 'number' && Number.isInteger(configured) && configured >= 1
        ? configured
        : DEFAULT_AI_QUEUE_CONCURRENCY;

    this.agingIntervalMs =
      schedulerOptions?.agingIntervalMs && schedulerOptions.agingIntervalMs > 0
        ? schedulerOptions.agingIntervalMs
        : DEFAULT_AI_QUEUE_AGING_INTERVAL_MS;
    this.agingStep =
      schedulerOptions?.agingStep !== undefined && schedulerOptions.agingStep >= 0
        ? schedulerOptions.agingStep
        : DEFAULT_AI_QUEUE_AGING_STEP;
    this.now = schedulerOptions?.now ?? (() => Date.now());

    this.logger.log(
      `Khởi tạo hàng đợi AI dùng chung với concurrency=${this.concurrency}, aging=+${this.agingStep}/${this.agingIntervalMs}ms`,
    );
  }

  /**
   * Đưa một tác vụ gọi AI vào hàng đợi dùng chung.
   * Tương thích ngược: gọi không truyền `options` mặc định là `{ priority: 0, lane: 'background' }`.
   */
  add<T>(task: () => Promise<T>, options: AiQueueTaskOptions = {}): Promise<T> {
    const priority = options.priority ?? 0;
    const lane: AiQueueLane = options.lane ?? 'background';

    return new Promise<T>((resolve, reject) => {
      this.waiting.push({
        task,
        priority,
        lane,
        enqueuedAt: this.now(),
        seq: this.nextSeq++,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.drain();
    });
  }

  /** Số tác vụ đang nằm trong hàng chờ. */
  get size(): number {
    return this.waiting.length;
  }

  /** Tổng số tác vụ đang thực thi song song. */
  get pending(): number {
    return this.activeByLane.live + this.activeByLane.background;
  }

  /** Chờ cho đến khi không còn tác vụ nào đang chạy hoặc đang chờ. */
  onIdle(): Promise<void> {
    if (this.pending === 0 && this.waiting.length === 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.idleResolvers.push(resolve);
    });
  }

  onModuleDestroy(): void {
    this.waiting.length = 0;
    this.notifyIdleIfNeeded();
  }

  private effectivePriority(item: QueuedTask, currentTime: number): number {
    const waitedMs = Math.max(0, currentTime - item.enqueuedAt);
    const agingBonus = Math.floor(waitedMs / this.agingIntervalMs) * this.agingStep;
    return item.priority + agingBonus;
  }

  /**
   * Chọn tác vụ kế tiếp từ `waiting`:
   * - Nếu bật Bulkhead mềm (`concurrency >= 2`), đang có tác vụ `background` chờ và `live` đã chiếm
   *   `concurrency - 1` slot → chỉ chọn trong nhóm `background` để giữ tối thiểu 1 slot cho việc nền.
   * - Ngược lại, chọn tác vụ có `effectivePriority` cao nhất (bằng điểm thì FIFO theo `seq`).
   */
  private pickNextIndex(): number {
    if (this.waiting.length === 0) {
      return -1;
    }

    const currentTime = this.now();
    const hasWaitingBackground = this.waiting.some((item) => item.lane === 'background');
    const reserveSlotForBackground =
      this.concurrency >= 2 &&
      hasWaitingBackground &&
      this.activeByLane.live >= this.concurrency - 1;

    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < this.waiting.length; i++) {
      const item = this.waiting[i];
      if (reserveSlotForBackground && item.lane !== 'background') {
        continue;
      }

      const score = this.effectivePriority(item, currentTime);
      if (
        bestIndex === -1 ||
        score > bestScore ||
        (score === bestScore && item.seq < this.waiting[bestIndex].seq)
      ) {
        bestIndex = i;
        bestScore = score;
      }
    }

    return bestIndex;
  }

  private drain(): void {
    while (this.pending < this.concurrency && this.waiting.length > 0) {
      const nextIndex = this.pickNextIndex();
      if (nextIndex === -1) {
        break;
      }
      const [item] = this.waiting.splice(nextIndex, 1);
      this.activeByLane[item.lane] += 1;
      void this.runItem(item);
    }
  }

  private async runItem(item: QueuedTask): Promise<void> {
    try {
      const result = await item.task();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.activeByLane[item.lane] -= 1;
      this.drain();
      this.notifyIdleIfNeeded();
    }
  }

  private notifyIdleIfNeeded(): void {
    if (this.pending === 0 && this.waiting.length === 0 && this.idleResolvers.length > 0) {
      const resolvers = this.idleResolvers.splice(0, this.idleResolvers.length);
      for (const resolve of resolvers) {
        resolve();
      }
    }
  }
}
