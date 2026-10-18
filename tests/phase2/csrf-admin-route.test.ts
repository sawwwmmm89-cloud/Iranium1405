import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireUser = vi.hoisted(() => vi.fn());
vi.mock('@/server/security/session', () => ({ requireUser, ADMIN_ROLES: ['SUPER_ADMIN', 'ADMIN'] }));
vi.mock('@/server/db/prisma', () => ({ prisma: {} }));

import { AppError } from '@/server/errors/app-error';
import { adminRoute } from '@/server/security/admin-route';
import { createCsrfToken, CSRF_COOKIE, CSRF_HEADER } from '@/server/security/csrf-constants';
import { csrfTokensMatch } from '@/server/security/csrf';

const token = createCsrfToken();
const make = (method: string, headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost:3000/api/v1/admin/x', { method, headers });
const handler = adminRoute({}, async (_req, _ctx, user) => NextResponse.json({ who: user.id }));
const body = async (r: Response) => (await r.json()) as { success?: boolean; error?: { code: string }; who?: string };

describe('csrf token helpers', () => {
  it('generates 43-char url-safe tokens that differ each time', () => {
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createCsrfToken()).not.toBe(token);
  });
  it('matches only identical, well-formed tokens', () => {
    expect(csrfTokensMatch(token, token)).toBe(true);
    expect(csrfTokensMatch(token, createCsrfToken())).toBe(false);
    expect(csrfTokensMatch(token, undefined)).toBe(false);
    expect(csrfTokensMatch('', '')).toBe(false);
    expect(csrfTokensMatch('short', 'short')).toBe(false);
  });
});

describe('adminRoute', () => {
  beforeEach(() => {
    requireUser.mockReset();
  });

  it('401 when not authenticated', async () => {
    requireUser.mockRejectedValue(new AppError(401, 'UNAUTHORIZED', 'x'));
    const res = await handler(make('GET'), undefined);
    expect(res.status).toBe(401);
  });
  it('403 for a role outside the allowed list', async () => {
    requireUser.mockRejectedValue(new AppError(403, 'FORBIDDEN', 'x'));
    expect((await handler(make('POST'), undefined)).status).toBe(403);
  });
  it('GET needs no CSRF token', async () => {
    requireUser.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
    const res = await handler(make('GET'), undefined);
    expect(res.status).toBe(200);
    expect((await body(res)).who).toBe('u1');
  });
  it('POST without / with wrong CSRF token -> 403 CSRF_INVALID', async () => {
    requireUser.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
    for (const headers of [
      {},
      { cookie: `${CSRF_COOKIE}=${token}` },
      { [CSRF_HEADER]: token },
      { cookie: `${CSRF_COOKIE}=${token}`, [CSRF_HEADER]: createCsrfToken() },
    ] as Record<string, string>[]) {
      const res = await handler(make('POST', headers), undefined);
      expect(res.status).toBe(403);
      expect((await body(res)).error?.code).toBe('CSRF_INVALID');
    }
  });
  it('POST with matching cookie + header passes', async () => {
    requireUser.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
    const res = await handler(make('POST', { cookie: `${CSRF_COOKIE}=${token}`, [CSRF_HEADER]: token }), undefined);
    expect(res.status).toBe(200);
  });
  it('rejects a cross-origin Origin header before anything else', async () => {
    requireUser.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
    const res = await handler(
      make('POST', { origin: 'https://evil.example', cookie: `${CSRF_COOKIE}=${token}`, [CSRF_HEADER]: token }),
      undefined,
    );
    expect(res.status).toBe(403);
    expect((await body(res)).error?.code).toBe('BAD_ORIGIN');
  });
  it('passes the allowed roles to requireUser (default ADMIN + SUPER_ADMIN)', async () => {
    requireUser.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
    await handler(make('GET'), undefined);
    expect(requireUser).toHaveBeenCalledWith(['SUPER_ADMIN', 'ADMIN']);
  });
});
