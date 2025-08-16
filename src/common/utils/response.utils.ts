import { ApiResponse, PaginatedResponse } from '../interfaces/api-response.interface';

export class ResponseUtils {
  static success<T>(data: T, message: string = 'Operation completed successfully'): ApiResponse<T> {
    return {
      status: 'success',
      message,
      data,
    };
  }

  static error<T>(message: string, data?: T): ApiResponse<T> {
    return {
      status: 'error',
      message,
      data: data as T,
    };
  }

  static warning<T>(data: T, message: string): ApiResponse<T> {
    return {
      status: 'warning',
      message,
      data,
    };
  }

  static paginated<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Data retrieved successfully'
  ): ApiResponse<PaginatedResponse<T>> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      status: 'success',
      message,
      data: {
        items,
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
} 