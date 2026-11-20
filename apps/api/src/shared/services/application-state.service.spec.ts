import { ConflictException, NotFoundException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../../generated/prisma/client.js';
import { APPLICATION_STATUS_CHANGED_EVENT } from '../constants/application-event.constant.js';
import { ApplicationStatus } from '../constants/application-status.enum.js';
import type { SharedApplicationStateRepository } from '../repositories/shared-application-state.repository.js';
import { ApplicationStateService } from './application-state.service.js';

vi.mock('../repositories/shared-application-state.repository.js', () => ({
  SharedApplicationStateRepository: class {},
}));

describe('ApplicationStateService', () => {
  const mockTx = {} as Prisma.TransactionClient;

  let repo: {
    findById: ReturnType<typeof vi.fn>;
    runInTransaction: ReturnType<typeof vi.fn>;
    updateStatusOptimistic: ReturnType<typeof vi.fn>;
    createInitialHistory: ReturnType<typeof vi.fn>;
  };
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };
  let service: ApplicationStateService;

  beforeEach(() => {
    repo = {
      findById: vi.fn(),
      runInTransaction: vi.fn((fn: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        fn(mockTx),
      ),
      updateStatusOptimistic: vi.fn().mockResolvedValue(true),
      createInitialHistory: vi.fn().mockResolvedValue({ id: 'hist-1' }),
    };
    eventEmitter = {
      emit: vi.fn(),
    };

    service = new ApplicationStateService(
      repo as unknown as SharedApplicationStateRepository,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  it('throws 404 NotFoundException when application does not exist', async () => {
    repo.findById.mockResolvedValueOnce(null);

    await expect(
      service.transition('app-1', ApplicationStatus.SCREENING),
    ).rejects.toThrow(NotFoundException);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('throws 409 ConflictException with fromStatus and toStatus on invalid transition', async () => {
    repo.findById.mockResolvedValueOnce({
      id: 'app-1',
      jobId: 'job-1',
      status: ApplicationStatus.SUBMITTED,
    });

    await expect(
      service.transition('app-1', ApplicationStatus.PASSED),
    ).rejects.toThrow(ConflictException);
    expect(repo.updateStatusOptimistic).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('updates status, writes history with actorId=null & reason, and emits event after transaction commits', async () => {
    const callOrder: string[] = [];
    repo.findById.mockResolvedValueOnce({
      id: 'app-1',
      jobId: 'job-1',
      status: ApplicationStatus.SCREENING,
    });
    repo.updateStatusOptimistic.mockImplementationOnce(async () => {
      callOrder.push('db-update');
      return true;
    });
    eventEmitter.emit.mockImplementationOnce(() => {
      callOrder.push('emit');
      return true;
    });

    const result = await service.transition(
      'app-1',
      ApplicationStatus.SCREENING_FAILED,
      { reason: 'Gemini timeout after 3 retries' },
    );

    expect(repo.updateStatusOptimistic).toHaveBeenCalledWith(
      {
        applicationId: 'app-1',
        fromStatus: ApplicationStatus.SCREENING,
        toStatus: ApplicationStatus.SCREENING_FAILED,
        actorId: null,
        reason: 'Gemini timeout after 3 retries',
      },
      mockTx,
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      APPLICATION_STATUS_CHANGED_EVENT,
      {
        applicationId: 'app-1',
        jobId: 'job-1',
        fromStatus: ApplicationStatus.SCREENING,
        toStatus: ApplicationStatus.SCREENING_FAILED,
        actorId: null,
      },
    );
    expect(callOrder).toEqual(['db-update', 'emit']);
    expect(result.event.actorId).toBeNull();
  });

  it('does not emit inside external transaction when tx option is provided', async () => {
    const externalTx = { external: true } as unknown as Prisma.TransactionClient;
    repo.findById.mockResolvedValueOnce({
      id: 'app-1',
      jobId: 'job-1',
      status: ApplicationStatus.SCREENED,
    });

    const result = await service.transition(
      'app-1',
      ApplicationStatus.SHORTLISTED,
      { actorId: 'hr-1', tx: externalTx },
    );

    expect(repo.runInTransaction).not.toHaveBeenCalled();
    expect(repo.updateStatusOptimistic).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'hr-1' }),
      externalTx,
    );
    expect(eventEmitter.emit).not.toHaveBeenCalled();

    service.emitStatusChanged(result.event);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
  });

  it('throws 409 ConflictException on concurrent modification (optimistic lock miss)', async () => {
    repo.findById
      .mockResolvedValueOnce({
        id: 'app-1',
        jobId: 'job-1',
        status: ApplicationStatus.SCREENED,
      })
      .mockResolvedValueOnce({
        id: 'app-1',
        jobId: 'job-1',
        status: ApplicationStatus.REJECTED,
      });
    repo.updateStatusOptimistic.mockResolvedValueOnce(false);

    await expect(
      service.transition('app-1', ApplicationStatus.SHORTLISTED, {
        actorId: 'hr-1',
      }),
    ).rejects.toThrow(ConflictException);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('records initial SUBMITTED history with fromStatus=null', async () => {
    const externalTx = { external: true } as unknown as Prisma.TransactionClient;

    await service.recordInitial(externalTx, 'app-1', 'cand-1');

    expect(repo.createInitialHistory).toHaveBeenCalledWith(
      {
        applicationId: 'app-1',
        actorId: 'cand-1',
        reason: null,
      },
      externalTx,
    );
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
