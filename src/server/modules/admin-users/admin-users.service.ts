import 'server-only';
import type { Prisma, Role } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { AppError, errors } from '@/server/errors/app-error';
import { parseId } from '@/server/modules/admin-courses/course.schema';
import { writeAudit } from '@/server/security/audit';
import type { AdminUserListQuery } from './user.schema';

export interface UserActor {
  id: string;
  role: Role;
  ip?: string | null;
}

const userSelect = {
  id: true, email: true, name: true, role: true, status: true, createdAt: true,
  _count: { select: { enrollments: true, orders: true } },
} as const;

/** Mutations: SUPER_ADMIN only, never on yourself. */
export function assertCanModifyUser(actor: UserActor, targetId: string): void {
  if (actor.role !== 'SUPER_ADMIN') throw errors.forbidden();
  if (actor.id === targetId) {
    throw new AppError(403, 'SELF_MODIFICATION_FORBIDDEN', 'تغییر نقش یا وضعیت حساب خودتان مجاز نیست.');
  }
}

/** Serialises concurrent demotions/suspensions of SUPER_ADMINs, then returns how many remain active. */
async function lockActiveSuperAdmins(tx: Prisma.TransactionClient): Promise<number> {
  await tx.$queryRaw`SELECT id FROM "User" WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE' AND "deletedAt" IS NULL FOR UPDATE`;
  return tx.user.count({ where: { role: 'SUPER_ADMIN', status: 'ACTIVE', deletedAt: null } });
}

const lastSuperAdminError = () =>
  new AppError(409, 'LAST_SUPER_ADMIN', 'آخرین مدیر ارشد فعال را نمی‌توان تنزل داد یا تعلیق کرد.');

/** GET list: ADMIN and SUPER_ADMIN (enforced by the route). Never selects passwordHash. */
export async function listAdminUsers(query: AdminUserListQuery) {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: userSelect,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total };
}

export async function changeUserRole(targetIdRaw: string, newRole: Role, actor: UserActor) {
  const targetId = parseId(targetIdRaw);
  assertCanModifyUser(actor, targetId);
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findFirst({
      where: { id: targetId, deletedAt: null },
      select: { id: true, role: true, status: true },
    });
    if (!target) throw errors.notFound('کاربر');
    if (target.role === newRole) return { id: targetId, role: target.role, changed: false };
    if (target.role === 'SUPER_ADMIN' && target.status === 'ACTIVE') {
      if ((await lockActiveSuperAdmins(tx)) <= 1) throw lastSuperAdminError();
    }
    await tx.user.update({ where: { id: targetId }, data: { role: newRole } });
    await writeAudit(tx, {
      actorId: actor.id, ip: actor.ip, action: 'user.role_change', entity: 'User',
      entityId: targetId, metadata: { from: target.role, to: newRole },
    });
    return { id: targetId, role: newRole, changed: true };
  });
}

/** Suspending revokes every active session of the user in the same transaction. */
export async function setUserStatus(targetIdRaw: string, status: 'ACTIVE' | 'SUSPENDED', actor: UserActor) {
  const targetId = parseId(targetIdRaw);
  assertCanModifyUser(actor, targetId);
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findFirst({
      where: { id: targetId, deletedAt: null },
      select: { id: true, role: true, status: true },
    });
    if (!target) throw errors.notFound('کاربر');
    if (target.status === status) return { id: targetId, status, changed: false };
    if (status === 'SUSPENDED' && target.role === 'SUPER_ADMIN') {
      if ((await lockActiveSuperAdmins(tx)) <= 1) throw lastSuperAdminError();
    }
    await tx.user.update({ where: { id: targetId }, data: { status } });
    let revokedSessions = 0;
    if (status === 'SUSPENDED') {
      const res = await tx.session.updateMany({
        where: { userId: targetId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      revokedSessions = res.count;
    }
    await writeAudit(tx, {
      actorId: actor.id, ip: actor.ip,
      action: status === 'SUSPENDED' ? 'user.suspend' : 'user.activate',
      entity: 'User', entityId: targetId, metadata: { revokedSessions },
    });
    return { id: targetId, status, changed: true };
  });
}
