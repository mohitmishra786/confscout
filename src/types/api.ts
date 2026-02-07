/**
 * Standard API Response Type
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
    stack?: string;
  };
  meta?: {
    requestId?: string;
    timestamp: string;
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

/**
 * Standard Paginated Response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    requestId?: string;
    timestamp: string;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}
