export interface ApiResponse<T = any> {
  status: 'success' | 'error' | 'warning';
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} 