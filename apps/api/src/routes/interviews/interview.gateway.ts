import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Namespace } from 'socket.io';
import type { z } from 'zod';
import { Role } from '../../generated/prisma/client.js';
import envConfig from '../../shared/config/env.config.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { TokenService } from '../../shared/services/token.service.js';
import {
  INTERVIEW_AUTH_ERRORS,
  INTERVIEW_ERROR_CODES,
  INTERVIEW_EVENTS,
  INTERVIEW_NAMESPACE,
  type InterviewAuthErrorCode,
} from './interviews.constant.js';
import { InterviewWebSocketError, isInterviewWebSocketError } from './interviews.error.js';
import {
  InterviewAnswerPayloadSchema,
  InterviewJoinPayloadSchema,
  InterviewStartPayloadSchema,
} from './interviews.schema.js';
import { InterviewsService } from './interviews.service.js';
import type {
  InterviewErrorPayload,
  InterviewPreparingPayload,
  InterviewSocket,
} from './interviews.type.js';

@Public()
@WebSocketGateway({
  namespace: INTERVIEW_NAMESPACE,
  cors: {
    origin: envConfig.FRONTEND_ORIGIN,
    credentials: true,
  },
})
export class InterviewGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(InterviewGateway.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly interviewsService: InterviewsService,
  ) {}

  afterInit(server: Namespace): void {
    server.use(async (socket, next) => {
      const rawToken = socket.handshake.auth?.token;
      const token = typeof rawToken === 'string' ? rawToken.trim() : '';

      if (!token) {
        next(this.createAuthError(INTERVIEW_AUTH_ERRORS.INVALID, 'Thiếu access token xác thực'));
        return;
      }

      try {
        const payload = await this.tokenService.verifyAccessToken(token);
        socket.data.user = {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
        };
        next();
      } catch (error) {
        if (this.isTokenExpiredError(error)) {
          next(this.createAuthError(INTERVIEW_AUTH_ERRORS.EXPIRED, 'Access token đã hết hạn'));
          return;
        }
        next(this.createAuthError(INTERVIEW_AUTH_ERRORS.INVALID, 'Access token không hợp lệ'));
      }
    });
  }

  handleConnection(client: InterviewSocket): void {
    const userId = client.data.user?.id ?? 'unknown';
    this.logger.log(`Socket connected id=${client.id} user=${userId}`);
  }

  handleDisconnect(client: InterviewSocket): void {
    const userId = client.data.user?.id ?? 'unknown';
    this.logger.log(`Socket disconnected id=${client.id} user=${userId}`);
  }

  @SubscribeMessage(INTERVIEW_EVENTS.JOIN)
  async handleJoin(
    @ConnectedSocket() client: InterviewSocket,
    @MessageBody() rawBody: unknown,
  ): Promise<void> {
    try {
      const user = this.requireCandidate(client);
      const body = this.parsePayload(InterviewJoinPayloadSchema, rawBody);
      const state = await this.interviewsService.joinInterview(body.interviewId, user.id);

      client.data.interviewId = body.interviewId;
      client.emit(INTERVIEW_EVENTS.STATE, state);
    } catch (error) {
      this.handleWebSocketError(client, error);
    }
  }

  @SubscribeMessage(INTERVIEW_EVENTS.START)
  async handleStart(
    @ConnectedSocket() client: InterviewSocket,
    @MessageBody() rawBody: unknown,
  ): Promise<void> {
    try {
      const user = this.requireCandidate(client);
      const interviewId = this.requireJoinedInterviewId(client);
      const body = this.parsePayload(InterviewStartPayloadSchema, rawBody);

      const result = await this.interviewsService.startInterview(
        interviewId,
        user.id,
        body.consent,
        () => {
          const preparing: InterviewPreparingPayload = {
            interviewId,
            message: 'Đang chuẩn bị bộ câu hỏi phỏng vấn...',
          };
          client.emit(INTERVIEW_EVENTS.PREPARING, preparing);
        },
      );

      if (result.kind === 'IGNORED') {
        return;
      }

      client.emit(INTERVIEW_EVENTS.QUESTION, result.firstQuestion);
    } catch (error) {
      this.handleWebSocketError(client, error);
    }
  }

  @SubscribeMessage(INTERVIEW_EVENTS.ANSWER)
  async handleAnswer(
    @ConnectedSocket() client: InterviewSocket,
    @MessageBody() rawBody: unknown,
  ): Promise<void> {
    try {
      const user = this.requireCandidate(client);
      const interviewId = this.requireJoinedInterviewId(client);
      const body = this.parsePayload(InterviewAnswerPayloadSchema, rawBody);

      const result = await this.interviewsService.submitAnswer(interviewId, user.id, body);

      if (result.kind === 'DUPLICATE') {
        client.emit(INTERVIEW_EVENTS.STATE, result.state);
        return;
      }
      if (result.kind === 'NEXT_QUESTION') {
        client.emit(INTERVIEW_EVENTS.QUESTION, result.question);
        return;
      }
      client.emit(INTERVIEW_EVENTS.COMPLETED, result.completed);
    } catch (error) {
      this.handleWebSocketError(client, error);
    }
  }

  private requireCandidate(client: InterviewSocket) {
    const user = client.data.user;
    if (!user) {
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.FORBIDDEN,
        'Phiên kết nối chưa được xác thực',
      );
    }
    if (user.role !== Role.CANDIDATE) {
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.FORBIDDEN,
        'Chỉ ứng viên mới được phép tham gia phiên phỏng vấn',
      );
    }
    return user;
  }

  private requireJoinedInterviewId(client: InterviewSocket): string {
    const interviewId = client.data.interviewId;
    if (!interviewId) {
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.NOT_JOINED,
        'Bạn cần tham gia phiên phỏng vấn trước khi thực hiện thao tác này',
      );
    }
    return interviewId;
  }

  private parsePayload<T>(schema: z.ZodType<T>, rawBody: unknown): T {
    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? 'Dữ liệu gửi lên không hợp lệ';
      throw new InterviewWebSocketError(INTERVIEW_ERROR_CODES.INVALID_PAYLOAD, firstIssue);
    }
    return parsed.data;
  }

  private handleWebSocketError(client: InterviewSocket, error: unknown): void {
    if (isInterviewWebSocketError(error)) {
      const payload: InterviewErrorPayload = {
        code: error.code,
        message: error.message,
      };
      client.emit(INTERVIEW_EVENTS.ERROR, payload);
      return;
    }

    const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
    this.logger.error(`Lỗi không xác định trên InterviewGateway: ${detail}`);
    const payload: InterviewErrorPayload = {
      code: INTERVIEW_ERROR_CODES.INTERNAL_ERROR,
      message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại.',
    };
    client.emit(INTERVIEW_EVENTS.ERROR, payload);
  }

  private createAuthError(code: InterviewAuthErrorCode, message: string): Error {
    const error = new Error(code) as Error & {
      data?: { code: InterviewAuthErrorCode; message: string };
    };
    error.data = { code, message };
    return error;
  }

  private isTokenExpiredError(error: unknown): boolean {
    return error instanceof Error && error.name === 'TokenExpiredError';
  }
}
