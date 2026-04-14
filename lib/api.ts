import type { ApiResponse } from '@/types/api';
import { getAccessToken, refreshAccessToken, clearTokens } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<ApiResponse<T>> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, options, false);
    }
    clearTokens();
    window.location.href = '/login';
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' } };
  }

  // 204 No Content 또는 빈 body 응답 처리 (res.json() 호출 시 파싱 에러 방지)
  if (res.status === 204) {
    return { success: true } as ApiResponse<T>;
  }

  const text = await res.text();
  if (!text) {
    return { success: res.ok } as ApiResponse<T>;
  }

  let json: ApiResponse<T>;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: `응답을 파싱할 수 없습니다. (status: ${res.status})` },
    };
  }
  return json;

}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'GET' });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  return request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  return request<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T>(path: string): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'DELETE' });
}
