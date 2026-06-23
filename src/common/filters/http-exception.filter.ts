import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// @Catch() with no arguments catches ALL exceptions — both HTTP and unexpected ones
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      // known NestJS HTTP exception — e.g. NotFoundException, UnauthorizedException
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // getResponse() can return string or object — handle both
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.message;
      } else {
        const responseObj = exceptionResponse as any;
        // class-validator errors come as array in message field
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.message;
      }
    } else {
      // unexpected error — e.g. DB connection failure, null pointer
      // return 500 and log the full error for debugging
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      // log full error details — only visible in server logs not in response
      this.logger.error(
        `Unexpected error on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // every error response has the same consistent shape
    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      // timestamp and path help with debugging and log correlation
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
