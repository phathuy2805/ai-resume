import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  APPLICATION_STATUS_CHANGED_EVENT,
  type ApplicationStatusChangedPayload,
} from '../constants/application-event.constant.js';
import { ApplicationStatus } from '../constants/application-status.enum.js';
import { ScreeningPipelineService } from './screening-pipeline.service.js';

/** Ứng viên vừa nộp CV (null → SUBMITTED, phát sau khi commit) → tự chấm ở nền. */
@Injectable()
export class ScreeningListener {
  constructor(private readonly pipeline: ScreeningPipelineService) {}

  @OnEvent(APPLICATION_STATUS_CHANGED_EVENT)
  handleStatusChanged(payload: ApplicationStatusChangedPayload): void {
    if (payload.toStatus === ApplicationStatus.SUBMITTED) {
      this.pipeline.enqueue(payload.applicationId);
    }
  }
}
