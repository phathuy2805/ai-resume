import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.ip;
  },
);

