import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { EnvConfig } from '../config/env.config.js';
import { AiQueueService, type AiQueueSchedulerOptions } from './ai-queue.service.js';

function createQueue(concurrency?: number, schedulerOptions?: AiQueueSchedulerOptions) {
  const config =
    concurrency === undefined
      ? undefined
      : ({ get: vi.fn().mockReturnValue(concurrency) } as unknown as ConfigService<EnvConfig, true>);
  return new AiQueueService(config, schedulerOptions);
}

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('AiQueueService', () => {
  it('defaults concurrency to 2 when ConfigService is not provided', () => {
    const service = createQueue();
    expect(service.concurrency).toBe(2);
  });

  it('caps concurrent running tasks to AI_QUEUE_CONCURRENCY', async () => {
    const service = createQueue(2);
    let active = 0;
    let maxActive = 0;

    const tasks = Array.from({ length: 5 }, (_, index) =>
      service.add(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 25));
        active -= 1;
        return index;
      }),
    );

    const results = await Promise.all(tasks);

    expect(results).toEqual([0, 1, 2, 3, 4]);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(maxActive).toBe(2);
  });

  it('propagates failure for a failed task while continuing subsequent tasks', async () => {
    const service = createQueue(2);

    const failing = service.add(async () => {
      throw new Error('Gemini 429');
    });
    const succeeding = service.add(async () => 'ok');

    await expect(failing).rejects.toThrow('Gemini 429');
    await expect(succeeding).resolves.toBe('ok');
  });

  it('runs higher-priority live tasks ahead of waiting background tasks', async () => {
    const service = createQueue(1);
    const gate = deferred();
    const order: string[] = [];

    const blocker = service.add(async () => {
      order.push('blocker');
      await gate.promise;
    });
    const bg1 = service.add(async () => {
      order.push('bg-1');
    });
    const bg2 = service.add(async () => {
      order.push('bg-2');
    });
    const live = service.add(
      async () => {
        order.push('live-1');
      },
      { priority: 10, lane: 'live' },
    );

    gate.resolve();
    await Promise.all([blocker, bg1, bg2, live]);

    expect(order).toEqual(['blocker', 'live-1', 'bg-1', 'bg-2']);
  });

  it('reserves 1 slot for waiting background tasks when live already occupies concurrency - 1 (work-conserving bulkhead)', async () => {
    const service = createQueue(2);
    const live1Gate = deferred();
    const live2Gate = deferred();
    const bg1Gate = deferred();
    const started: string[] = [];

    // Slot 1 & 2 đang bận: live-1 + bg-0 sẽ chiếm khi rảnh, trước hết lấp đầy 2 slot
    const live1 = service.add(
      async () => {
        started.push('live-1');
        await live1Gate.promise;
      },
      { priority: 10, lane: 'live' },
    );
    const live2 = service.add(
      async () => {
        started.push('live-2');
        await live2Gate.promise;
      },
      { priority: 10, lane: 'live' },
    );

    // Chưa có background chờ nên live dùng trọn cả 2/2 slot (work-conserving)
    expect(started).toEqual(['live-1', 'live-2']);

    // Giờ xếp thêm 2 task live ưu tiên cao và 1 task background ưu tiên 0
    const live3 = service.add(
      async () => {
        started.push('live-3');
      },
      { priority: 10, lane: 'live' },
    );
    const live4 = service.add(
      async () => {
        started.push('live-4');
      },
      { priority: 10, lane: 'live' },
    );
    const bg1 = service.add(
      async () => {
        started.push('bg-1');
        await bg1Gate.promise;
      },
      { priority: 0, lane: 'background' },
    );

    // Giải phóng slot của live-2 (live-1 vẫn đang chạy = 1 slot live) → slot trống phải cấp cho bg-1
    live2Gate.resolve();
    await live2;
    expect(started).toEqual(['live-1', 'live-2', 'bg-1']);

    // Giải phóng tiếp live-1 và bg-1 → live-3, live-4 chạy hết
    live1Gate.resolve();
    bg1Gate.resolve();
    await Promise.all([live1, live3, live4, bg1]);
    await service.onIdle();

    expect(started).toEqual(['live-1', 'live-2', 'bg-1', 'live-3', 'live-4']);
  });

  it('prevents starvation via priority aging when a background task waits long enough', async () => {
    let fakeNow = 0;
    const service = createQueue(1, {
      agingIntervalMs: 60_000,
      agingStep: 2,
      now: () => fakeNow,
    });
    const gate = deferred();
    const order: string[] = [];

    const blocker = service.add(async () => {
      order.push('blocker');
      await gate.promise;
    });

    // Tác vụ nền xếp hàng lúc t = 0 với priority = 0
    const agedBg = service.add(
      async () => {
        order.push('aged-bg');
      },
      { priority: 0, lane: 'background' },
    );

    // Trôi qua 6 phút (360_000ms): agedBg được cộng +12 điểm → effectivePriority = 12
    fakeNow = 360_000;

    // Tác vụ live mới đến lúc t = 6 phút với priority = 10
    const freshLive = service.add(
      async () => {
        order.push('fresh-live');
      },
      { priority: 10, lane: 'live' },
    );

    gate.resolve();
    await Promise.all([blocker, agedBg, freshLive]);

    expect(order).toEqual(['blocker', 'aged-bg', 'fresh-live']);
  });
});
