export class ClientApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) {
    super(message);
  }
}

/** Same-origin JSON call to /api/v1 (browser sends Origin; session cookie is HttpOnly). */
export async function apiCall<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as { success?: boolean; data?: T; error?: { code: string; message: string } } | null;
  if (!res.ok || !json?.success) throw new ClientApiError(json?.error?.message ?? 'خطای ناشناخته', res.status, json?.error?.code ?? 'UNKNOWN');
  return json.data as T;
}
