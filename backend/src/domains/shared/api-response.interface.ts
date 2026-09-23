export interface ApiResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: any;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponseEnvelope<T = any> {
  success: boolean;
  data: T | null;
  error: ApiErrorDetail | null;
  meta: ApiResponseMeta | null;
  correlationId: string;
  timestamp: string;
}
