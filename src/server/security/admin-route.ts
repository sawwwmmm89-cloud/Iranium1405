import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';
import type { Role } from '@prisma/client';
import { MUTATING, route } from '@/server/errors/route';
import { assertCsrf } from './csrf';
import { ADMIN_ROLES, requireUser, type SessionUser } from './session';

export interface AdminRouteOptions {
  /** Defaults to ADMIN + SUPER_ADMIN. */
  roles?: Role[];
}

/**
 * Server-side boundary for admin API handlers, in this order:
 * Origin check (route) -> authentication/role (401/403) -> CSRF for mutating methods (403).
 */
export function adminRoute<C = unknown>(
  options: AdminRouteOptions,
  handler: (req: NextRequest, ctx: C, user: SessionUser) => Promise<NextResponse>,
) {
  return route<C>(async (req, ctx) => {
    const user = await requireUser(options.roles ?? ADMIN_ROLES);
    if (MUTATING.has(req.method)) assertCsrf(req);
    return handler(req, ctx, user);
  });
}

export const clientIp = (req: NextRequest): string | null =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
