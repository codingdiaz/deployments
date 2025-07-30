/**
 * API contract types for the deployments plugin.
 */

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: {
    /** Human-readable error message */
    message: string;
    /** Error code for programmatic handling */
    code: string;
    /** Additional error details */
    details?: Record<string, any>;
    /** Stack trace (only in development) */
    stack?: string;
  };
}

/**
 * Standard API success response format
 */
export interface ApiSuccessResponse<T = any> {
  /** Response data */
  data: T;
  /** Optional metadata */
  meta?: {
    /** Timestamp of the response */
    timestamp: string;
    /** Request ID for tracing */
    requestId?: string;
    /** Pagination info (if applicable) */
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  };
}

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page?: number;
  /** Number of items per page */
  pageSize?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Common query parameters for filtering
 */
export interface FilterParams {
  /** Filter by status */
  status?: string;
  /** Filter by date range (ISO string) */
  startDate?: string;
  /** Filter by date range (ISO string) */
  endDate?: string;
  /** Search query */
  search?: string;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  /** Service status */
  status: 'ok' | 'error';
  /** Timestamp of the check */
  timestamp: string;
  /** Service version */
  version: string;
  /** Additional service information */
  details?: Record<string, any>;
}

/**
 * Validation error details
 */
export interface ValidationError {
  /** Field that failed validation */
  field: string;
  /** Validation error message */
  message: string;
  /** Invalid value that was provided */
  value?: any;
  /** Validation rule that failed */
  rule?: string;
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse extends ApiErrorResponse {
  error: ApiErrorResponse['error'] & {
    /** Array of validation errors */
    validationErrors: ValidationError[];
  };
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  /** Maximum number of requests allowed */
  limit: number;
  /** Number of requests remaining */
  remaining: number;
  /** Timestamp when the rate limit resets */
  resetAt: string;
  /** Time window for the rate limit in seconds */
  windowSeconds: number;
}

/**
 * Rate limit error response
 */
export interface RateLimitErrorResponse extends ApiErrorResponse {
  error: ApiErrorResponse['error'] & {
    /** Rate limit information */
    rateLimit: RateLimitInfo;
    /** Retry after seconds */
    retryAfter: number;
  };
}