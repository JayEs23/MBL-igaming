import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => {
        // If the response is already in the correct format, return it as is
        if (data && typeof data === 'object' && 'status' in data && 'message' in data && 'data' in data) {
          return data;
        }
        
        // If it's not in the correct format, wrap it (fallback for any missed responses)
        return {
          status: 'success',
          message: 'Operation completed successfully',
          data: data,
        };
      }),
    );
  }
} 