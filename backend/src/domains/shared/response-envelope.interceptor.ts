import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseEnvelope } from './api-response.interface';
import { CORRELATION_ID_HEADER } from './correlation-id.middleware';

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ApiResponseEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseEnvelope<T>> {
    const request = context.switchToHttp().getRequest();
    const correlationId = (request.headers[CORRELATION_ID_HEADER] as string) || 'N/A';

    return next.handle().pipe(
      map((result) => {
        let data = result;
        let meta = null;

        // Extract metadata if returned in structured format { data, meta }
        if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
          data = result.data;
          meta = result.meta;
        }

        return {
          success: true,
          data: data !== undefined ? data : null,
          error: null,
          meta: meta,
          correlationId: correlationId,
          timestamp: new Date().toISOString(), // Strict UTC ISO String
        };
      }),
    );
  }
}
