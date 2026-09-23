import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface ApiResponseEnvelope<T = any> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  meta: any;
  correlationId: string;
  timestamp: string;
}

class ApiClient {
  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const correlationId = uuidv4();
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    return {
      'Content-Type': 'application/json',
      'x-correlation-id': correlationId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...customHeaders,
    };
  }

  async get<T = any>(endpoint: string, headers: Record<string, string> = {}): Promise<ApiResponseEnvelope<T>> {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(headers),
    });

    return res.json();
  }

  async post<T = any>(
    endpoint: string,
    body: any,
    idempotencyKey?: string,
    headers: Record<string, string> = {},
  ): Promise<ApiResponseEnvelope<T>> {
    const customHeaders: Record<string, string> = {
      ...headers,
      ...(idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {}),
    };

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(customHeaders),
      body: JSON.stringify(body),
    });

    return res.json();
  }
}

export const apiClient = new ApiClient();
