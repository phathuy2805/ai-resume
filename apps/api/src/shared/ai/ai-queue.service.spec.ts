import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { EnvConfig } from '../config/env.config.js';
import { AiQueueService } from './ai-queue.service.js';

function createQueue(concurrency?: number) {
  const config =
    concurrency === undefined
      ? undefined
      : ({ get: vi.fn().mockReturnValue(concurrency) } as unknown as ConfigService<EnvConfig, true>);
  return new AiQueueService(config);
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
});
