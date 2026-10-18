import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { AppError } from '@/server/errors/app-error';
import { CSRF_COOKIE, CSRF_HEADER, CSRF_TOKEN_PATTERN } from './csrf-constants';

/** Double-submit check. Both values must be well-formed (same fixed length) and equal. */
export function csrfTokensMatch(cookieValue?: string | null, headerValue?: string | null): boolean {
  if (!cookieValue || !headerValue) return false;
  if (!CSRF_TOKEN_PATTERN.test(cookieValue) || !CSRF_TOKEN_PATTERN.test(headerValue)) return false;
  return timingSafeEqual(Buffer.from(cookieValue), Buffer.from(headerValue));
}

export function assertCsrf(req: NextRequest): void {
  if (!csrfTokensMatch(req.cookies.get(CSRF_COOKIE)?.value, req.headers.get(CSRF_HEADER))) {
    throw new AppError(403, 'CSRF_INVALID', 'توکن امنیتی نامعتبر است. صفحه را تازه‌سازی کنید.');
  }
}
