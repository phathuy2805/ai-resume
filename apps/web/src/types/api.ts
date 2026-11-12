export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  errors?: string[];
  timestamp?: string;
}

export type ApiErrorKind = 'http' | 'network' | 'cancelled' | 'unknown' | 'contract';

export class ApiError extends Error {
  readonly status?: number;
  readonly kind: ApiErrorKind;
  readonly errors: string[];
  readonly timestamp?: string;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      kind: ApiErrorKind;
      errors?: string[];
      timestamp?: string;
      retryable?: boolean;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.kind = options.kind;
    this.errors = options.errors ?? [];
    this.timestamp = options.timestamp;
    this.retryable = options.retryable ?? true;
  }
}
