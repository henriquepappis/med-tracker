import { env } from '../config/env';

type ApiOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
};

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = json?.message ?? 'Request failed';
    const error = new Error(message);
    (error as Error & { status?: number; details?: unknown }).status = response.status;
    (error as Error & { status?: number; details?: unknown }).details = json;
    throw error;
  }

  return json as T;
}

export const api = {
  get<T>(path: string, token?: string | null) {
    return request<T>(path, { token });
  },
  post<T>(path: string, body?: unknown, token?: string | null) {
    return request<T>(path, { method: 'POST', body, token });
  },
};
