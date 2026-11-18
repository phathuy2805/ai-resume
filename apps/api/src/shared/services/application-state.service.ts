import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  APPLICATION_STATUS_CHANGED_EVENT,
  type ApplicationStatusChangedPayload,
} from '../constants/application-event.constant.js';
import type { ApplicationStatus } from '../constants/application-status.enum.js';
import { canTransition } from '../constants/application-transitions.js';
import {
  ApplicationStateNotFoundException,
  createInvalidApplicationTransitionException,
} from '../errors/application-state.error.js';
import { SharedApplicationStateRepository } from '../repositories/shared-application-state.repository.js';
import type { TransitionOptions, TransitionResult } from '../types/application-state.type.js';

@Injectable()
export class ApplicationStateService {
  private readonly logger = new Logger(ApplicationStateService.name);

  constructor(
    private readonly stateRepo: SharedApplicationStateRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async transition(
    applicationId: string,
    toStatus: ApplicationStatus,
    options: TransitionOptions = {},
  ): Promise<TransitionResult> {
    const { actorId = null, reason = null, tx } = options;

    if (tx) {
      return this.executeTransition(applicationId, toStatus, actorId, reason, tx);
    }

    const result = await this.stateRepo.runInTransaction((innerTx) =>
      this.executeTransition(applicationId, toStatus, actorId, reason, innerTx),
    );

    this.emitStatusChanged(result.event);
    return result;
  }

  recordInitial(
    tx: Prisma.TransactionClient,
    applicationId: string,
    actorId: string | null = null,
    reason: string | null = null,
  ) {
    return this.stateRepo.createInitialHistory({ applicationId, actorId, reason }, tx);
  }

  emitStatusChanged(payload: ApplicationStatusChangedPayload): void {
    this.logger.log(
      `Event ${APPLICATION_STATUS_CHANGED_EVENT}: app=${payload.applicationId} ${payload.fromStatus ?? 'null'} -> ${payload.toStatus} (actor=${payload.actorId ?? 'system'})`,
    );
    this.eventEmitter.emit(APPLICATION_STATUS_CHANGED_EVENT, payload);
  }

  private async executeTransition(
    applicationId: string,
    toStatus: ApplicationStatus,
    actorId: string | null,
    reason: string | null,
    tx: Prisma.TransactionClient,
  ): Promise<TransitionResult> {
    const application = await this.stateRepo.findById(applicationId, tx);
    if (!application) {
      throw ApplicationStateNotFoundException;
    }

    const fromStatus = application.status as ApplicationStatus;
    if (!canTransition(fromStatus, toStatus)) {
      throw createInvalidApplicationTransitionException(fromStatus, toStatus);
    }

    const updated = await this.stateRepo.updateStatusOptimistic(
      { applicationId, fromStatus, toStatus, actorId, reason },
      tx,
    );

    if (!updated) {
      const latest = await this.stateRepo.findById(applicationId, tx);
      if (!latest) {
        throw ApplicationStateNotFoundException;
      }
      throw createInvalidApplicationTransitionException(
        latest.status as ApplicationStatus,
        toStatus,
      );
    }

    const event: ApplicationStatusChangedPayload = {
      applicationId,
      jobId: application.jobId,
      fromStatus,
      toStatus,
      actorId,
    };

    return {
      applicationId,
      jobId: application.jobId,
      fromStatus,
      toStatus,
      actorId,
      event,
    };
  }
}
