/**
 * Common Architecture Baseline Types (v3)
 * Standardized API Response Envelope, Pagination, Audit Trail & Outbox Events
 */

export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T | null;
  errors: Array<{ code: string; message: string; field?: string }> | null;
  meta: {
    timestamp: string;
    request_id: string;
    execution_time_ms: number;
    correlation_id?: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total_records: number;
    total_pages: number;
  };
}

export interface OutboxEvent<T = any> {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: T;
  status: "pending" | "processed" | "failed";
  retry_count: number;
  correlation_id: string;
  created_at: string;
  processed_at?: string;
}

export interface AuditLogRecord {
  id: string;
  tenant_id?: string;
  organization_id?: string;
  user_id: string;
  action: string;
  entity_name: string;
  entity_id: string;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

export function createApiEnvelope<T>(
  data: T,
  options?: {
    requestId?: string;
    correlationId?: string;
    executionTimeMs?: number;
    pagination?: ApiResponseEnvelope<T>["pagination"];
  }
): ApiResponseEnvelope<T> {
  return {
    success: true,
    data,
    errors: null,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: options?.requestId || `req_${Math.random().toString(36).substring(2, 10)}`,
      execution_time_ms: options?.executionTimeMs || 12,
      correlation_id: options?.correlationId || `corr_${Math.random().toString(36).substring(2, 10)}`,
    },
    pagination: options?.pagination,
  };
}

export function createApiErrorEnvelope(
  errors: Array<{ code: string; message: string; field?: string }>,
  options?: {
    requestId?: string;
    correlationId?: string;
  }
): ApiResponseEnvelope<null> {
  return {
    success: false,
    data: null,
    errors,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: options?.requestId || `req_${Math.random().toString(36).substring(2, 10)}`,
      execution_time_ms: 5,
      correlation_id: options?.correlationId || `corr_${Math.random().toString(36).substring(2, 10)}`,
    },
  };
}
