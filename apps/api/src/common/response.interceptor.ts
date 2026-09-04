import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Bentuk response konsisten di seluruh endpoint: { data, error, meta }
 * (lihat research/tech/02-backend-api.md — "Desain API").
 *
 * Service boleh mengembalikan `{ data, meta }` bila perlu mengirim metadata
 * paginasi; selain itu nilai balik dianggap sebagai `data`.
 */
export interface ApiEnvelope<T> {
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta: Record<string, unknown> | null;
}

type MaybeWithMeta = { data: unknown; meta?: Record<string, unknown> };

function hasMeta(value: unknown): value is MaybeWithMeta {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value &&
    Object.keys(value).length <= 2
  );
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiEnvelope<unknown>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<unknown>> {
    return next.handle().pipe(
      map((payload) => {
        if (hasMeta(payload)) {
          return { data: payload.data, error: null, meta: payload.meta ?? null };
        }
        return { data: payload ?? null, error: null, meta: null };
      }),
    );
  }
}
