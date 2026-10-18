import { CSRF_COOKIE, CSRF_HEADER } from '@/server/security/csrf-constants';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly fields: Record<string, string[] | undefined> = {},
  ) {
    super(message);
  }
}

const readCookie = (name: string): string | undefined =>
  document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);

export const readCsrfToken = (): string | undefined => readCookie(CSRF_COOKIE);

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, string[] | undefined> };
}

/** Client helper for /api/v1/admin/*: JSON + X-CSRF-Token from the bama_csrf cookie. */
export async function adminFetch<T>(path: string, method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = readCookie(CSRF_COOKIE);
  if (token && method !== 'GET') headers[CSRF_HEADER] = token;
  const res = await fetch(`/api/v1/admin${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !json?.success) {
    throw new ApiError(json?.error?.message ?? 'خطای ناشناخته', res.status, json?.error?.code ?? 'UNKNOWN', json?.error?.details);
  }
  return json.data as T;
}
