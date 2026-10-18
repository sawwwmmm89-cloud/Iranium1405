import 'server-only';
import type { LiveStatus } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { AppError, errors } from '@/server/errors/app-error';
import type { AdminContext } from '@/server/modules/admin-courses/context';
import { parseId } from '@/server/modules/admin-courses/course.schema';
import { getLiveProvider } from '@/server/providers/live';
import { writeAudit } from '@/server/security/audit';
import { ADMIN_ROLES, type SessionUser } from '@/server/security/session';
import type { CreateLiveInput, UpdateLiveInput } from './live.schema';

const adminSelect = {
  id: true, title: true, description: true, instructorId: true, thumbnail: true, startsAt: true, durationMin: true,
  capacity: true, price: true, status: true, providerRef: true, createdAt: true,
} as const;

/* -------------------------------- admin -------------------------------- */

export const listAdminLive = () => prisma.liveClass.findMany({ where: { deletedAt: null }, orderBy: { startsAt: 'desc' }, take: 100, select: adminSelect });

export function createLive(input: CreateLiveInput, ctx: AdminContext) {
  return prisma.$transaction(async (tx) => {
    if (!(await tx.instructor.findUnique({ where: { id: input.instructorId }, select: { id: true } }))) {
      throw new AppError(422, 'INVALID_REFERENCE', 'مدرس انتخاب‌شده وجود ندارد.', { instructorId: ['نامعتبر'] });
    }
    const live = await tx.liveClass.create({ data: { ...input, status: 'SCHEDULED' }, select: adminSelect });
    await writeAudit(tx, { actorId: ctx.actorId, ip: ctx.ip, action: 'live.create', entity: 'LiveClass', entityId: live.id });
    return live;
  });
}

export function updateLive(idRaw: string, patch: UpdateLiveInput, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    if (!(await tx.liveClass.findFirst({ where: { id, deletedAt: null }, select: { id: true } }))) throw errors.notFound('کلاس');
    const live = await tx.liveClass.update({ where: { id }, data: patch, select: adminSelect });
    await writeAudit(tx, { actorId: ctx.actorId, ip: ctx.ip, action: 'live.update', entity: 'LiveClass', entityId: id, metadata: { fields: Object.keys(patch) } });
    return live;
  });
}

export function setLiveStatus(idRaw: string, status: LiveStatus, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    const live = await tx.liveClass.findFirst({ where: { id, deletedAt: null }, select: { status: true } });
    if (!live) throw errors.notFound('کلاس');
    await tx.liveClass.update({ where: { id }, data: { status } });
    await writeAudit(tx, { actorId: ctx.actorId, ip: ctx.ip, action: 'live.status', entity: 'LiveClass', entityId: id, metadata: { from: live.status, to: status } });
    return { id, status };
  });
}

export function deleteLive(idRaw: string, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    if (!(await tx.liveClass.findFirst({ where: { id, deletedAt: null }, select: { id: true } }))) throw errors.notFound('کلاس');
    await tx.liveClass.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit(tx, { actorId: ctx.actorId, ip: ctx.ip, action: 'live.delete', entity: 'LiveClass', entityId: id });
    return { id };
  });
}

/* -------------------------------- public -------------------------------- */

/** Free classes only; paid ones go through /orders. Capacity is checked under a row lock so it cannot be oversold. */
export async function enrollLive(user: SessionUser, idRaw: string) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "LiveClass" WHERE id = ${id}::uuid FOR UPDATE`;
    const live = await tx.liveClass.findFirst({
      where: { id, deletedAt: null, status: { in: ['SCHEDULED', 'LIVE'] } },
      select: { id: true, price: true, capacity: true },
    });
    if (!live) throw errors.notFound('کلاس');
    if (live.price > 0) throw new AppError(402, 'PAYMENT_REQUIRED', 'این کلاس پولی است. ابتدا سفارش ایجاد و پرداخت کنید.');
    const already = await tx.liveEnrollment.findUnique({ where: { userId_liveClassId: { userId: user.id, liveClassId: id } }, select: { id: true } });
    if (already) return { enrolled: true, created: false };
    if (live.capacity !== null && (await tx.liveEnrollment.count({ where: { liveClassId: id } })) >= live.capacity) {
      throw new AppError(409, 'CAPACITY_FULL', 'ظرفیت این کلاس تکمیل شده است.');
    }
    await tx.liveEnrollment.create({ data: { userId: user.id, liveClassId: id } });
    await writeAudit(tx, { actorId: user.id, action: 'live.enroll', entity: 'LiveClass', entityId: id });
    return { enrolled: true, created: true };
  });
}

/** Authorization first; the provider only supplies join info for authorized users, and may be "not configured". */
export async function getLiveAccess(user: SessionUser, idRaw: string) {
  const id = parseId(idRaw);
  const live = await prisma.liveClass.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, providerRef: true } });
  if (!live) throw errors.notFound('کلاس');
  const enrolled = ADMIN_ROLES.includes(user.role) || !!(await prisma.liveEnrollment.findUnique({ where: { userId_liveClassId: { userId: user.id, liveClassId: id } }, select: { id: true } }));
  if (!enrolled) throw errors.forbidden();
  const provider = getLiveProvider();
  if (live.status !== 'LIVE') return { status: live.status, canJoin: false, providerConfigured: !!provider, embedUrl: null };
  if (!provider || !live.providerRef) return { status: live.status, canJoin: false, providerConfigured: !!provider, embedUrl: null };
  const info = await provider.getJoinInfo({ liveClassId: id, providerRef: live.providerRef, userId: user.id });
  return { status: live.status, canJoin: true, providerConfigured: true, embedUrl: info.embedUrl };
}
