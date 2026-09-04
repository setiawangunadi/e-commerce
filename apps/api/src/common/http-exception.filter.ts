import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { ApiEnvelope } from './response.interceptor';

/** Memastikan error juga memakai envelope { data, error, meta } yang sama. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Terjadi kesalahan pada server';
    let code = 'INTERNAL_ERROR';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = HttpStatus[status] ?? 'ERROR';
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const record = body as Record<string, unknown>;
        // ValidationPipe mengembalikan `message` berupa array pesan per-field.
        if (Array.isArray(record.message)) {
          message = 'Data yang dikirim tidak valid';
          details = record.message;
        } else if (typeof record.message === 'string') {
          message = record.message;
        }
      }
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    const envelope: ApiEnvelope<never> = {
      data: null,
      error: { code, message, ...(details ? { details } : {}) },
      meta: null,
    };

    void reply.status(status).send(envelope);
  }
}
