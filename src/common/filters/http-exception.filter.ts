import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ResponseUtils } from '../utils/response.utils';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    let data: any = null;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      message = Array.isArray(exceptionResponse.message) 
        ? exceptionResponse.message[0] 
        : exceptionResponse.message;
      
      if ('error' in exceptionResponse) {
        data = { error: exceptionResponse.error };
      }
    } else {
      message = 'Internal server error';
    }

    const errorResponse = ResponseUtils.error(message, data);
    
    response.status(status).json(errorResponse);
  }
} 