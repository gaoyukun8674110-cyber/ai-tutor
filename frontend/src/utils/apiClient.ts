export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
export const API_KEY = import.meta.env.VITE_API_KEY || 'local-dev-key';

export interface ApiRequestOptions extends RequestInit {
  signal?: AbortSignal;
}

export class ApiError extends Error {
  status: number;
  code: string;
  traceId?: string;

  constructor(message: string, status: number, code: string, traceId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.traceId = traceId;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function getUserFacingError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Authentication is required. Check VITE_API_KEY.';
    if (error.status === 403) return 'You do not have permission for this action.';
    if (error.status >= 500) {
      console.error('Server error', { code: error.code, traceId: error.traceId, message: error.message });
      return error.traceId ? `${error.message} (trace ${error.traceId})` : error.message;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : 'Unexpected error';
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    let code = response.status >= 500 ? 'server_error' : 'request_error';
    let traceId = response.headers.get('X-Trace-Id') || undefined;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') {
        detail = body.detail;
      } else if (body.detail && typeof body.detail === 'object') {
        detail = body.detail.user_message || detail;
        code = body.detail.code || code;
        traceId = body.detail.trace_id || traceId;
      }
    } catch {
      // Keep HTTP status text when the backend does not return JSON.
    }
    throw new ApiError(detail, response.status, code, traceId);
  }

  return response.json() as Promise<T>;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-API-Key', API_KEY);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  return parseJsonResponse<T>(response);
}

export async function apiUpload<T>(path: string, body: FormData, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('X-API-Key', API_KEY);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method: options.method || 'POST',
    headers,
    body,
  });

  return parseJsonResponse<T>(response);
}
