import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isPayloadTooLarge =
      !(exception instanceof HttpException) &&
      (exception as { status?: number; type?: string })?.status === 413 ||
      (exception as { type?: string })?.type === 'entity.too.large';

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : isPayloadTooLarge
        ? HttpStatus.PAYLOAD_TOO_LARGE
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : isPayloadTooLarge
        ? 'Payload too large'
        : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message ?? message,
      timestamp: new Date().toISOString(),
    });
  }
}
