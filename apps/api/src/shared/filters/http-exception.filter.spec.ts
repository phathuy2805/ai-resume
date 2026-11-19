import {
  type ArgumentsHost,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter.js';

function run(exception: unknown) {
  const json = vi.fn((_body: Record<string, unknown>) => undefined);
  const status = vi.fn((_code: number) => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  new HttpExceptionFilter().catch(exception, host);
  return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
}

describe('HttpExceptionFilter', () => {
  it('trả kèm code khi exception có code', () => {
    const { status, body } = run(
      new UnprocessableEntityException({
        message: 'CV có vẻ là ảnh scan',
        code: 'SCANNED',
      }),
    );

    expect(status).toBe(422);
    expect(body).toMatchObject({
      statusCode: 422,
      message: 'CV có vẻ là ảnh scan',
      code: 'SCANNED',
    });
  });

  it('không có code thì không thêm trường code (giữ hành vi cũ)', () => {
    const { body } = run(new NotFoundException('Không tìm thấy'));

    expect(body).toMatchObject({ statusCode: 404, message: 'Không tìm thấy' });
    expect(body).not.toHaveProperty('code');
  });

  it('bỏ qua code không phải string', () => {
    const { body } = run(new BadRequestException({ message: 'x', code: 123 }));

    expect(body).not.toHaveProperty('code');
  });

  it('lỗi không phải HttpException → 500, không có code', () => {
    const { status, body } = run(new Error('boom'));

    expect(status).toBe(500);
    expect(body).toMatchObject({ message: 'Internal server error' });
    expect(body).not.toHaveProperty('code');
  });
});
