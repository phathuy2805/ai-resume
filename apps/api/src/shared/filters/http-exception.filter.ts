import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown = undefined;

    if (exception instanceof ZodValidationException) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      const zodError = exception.getZodError();
      if (zodError instanceof ZodError) {
        errors = zodError.issues.map(
          (issue) =>
            `${issue.path.length > 0 ? issue.path.join('.') + ': ' : ''}${issue.message}`,
        );
      } else if (
        typeof zodError === 'object' &&
        zodError !== null &&
        'issues' in zodError
      ) {
        const issues = (
          zodError as {
            issues: Array<{ path: Array<string | number>; message: string }>;
          }
        ).issues;
        errors = issues.map(
          (issue) =>
            `${issue.path.length > 0 ? issue.path.join('.') + ': ' : ''}${issue.message}`,
        );
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;
        if (Array.isArray(resObj.message)) {
          errors = resObj.message;
          message = 'Validation failed';
        } else if (resObj.errors) {
          errors = resObj.errors;
        }
      } else {
        message = res;
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
