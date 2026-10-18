import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import type { Role } from '@prisma/client';
import { getEnv } from '@/lib/env';
import { prisma } from '@/server/db/prisma';
import { errors } from '@/server/errors/app-error';

export const SESSION_COOKIE = 'bama_session';
const TTL_MS = 1000 * 60 * 60 * 24 * 30;

/** Keyed hash: a DB leak alone cannot be used to forge session tokens. */
const sha256 = (v: string) => createHmac('sha256', getEnv().AUTH_SECRET).update(v).digest('hex');

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const h = await headers();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      userAgent: h.get('user-agent')?.slice(0, 255),
      ip: h.get('x-forwarded-for')?.split(',')[0]?.trim(),
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_MS / 1000,
  });
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  const { user } = session;
  if (user.deletedAt || user.status !== 'ACTIVE') return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  store.delete(SESSION_COOKIE);
}

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw errors.unauthorized();
  if (roles && !roles.includes(user.role)) throw errors.forbidden();
  return user;
}

export const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN'];
