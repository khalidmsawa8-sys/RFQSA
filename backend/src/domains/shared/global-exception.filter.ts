import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponseEnvelope } from './api-response.interface';
import { CORRELATION_ID_HEADER } from './correlation-id.middleware';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = (request.headers[CORRELATION_ID_HEADER] as string) || 'N/A';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'حدث خطأ غير متوقع في النظام';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resResponse: any = exception.getResponse();

      if (typeof resResponse === 'object' && resResponse !== null) {
        errorMessage = resResponse.message || exception.message;
        errorCode = resResponse.error || `HTTP_${status}`;
        errorDetails = Array.isArray(resResponse.message) ? resResponse.message : null;
      } else {
        errorMessage = resResponse || exception.message;
        errorCode = `HTTP_${status}`;
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
    }

    const payload: ApiResponseEnvelope = {
      success: false,
      data: null,
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
      },
      meta: null,
      correlationId: correlationId,
      timestamp: new Date().toISOString(), // Strict UTC
    };

    response.status(status).json(payload);
  }
}
