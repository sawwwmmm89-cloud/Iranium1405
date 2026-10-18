import 'server-only';
import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
import { AppError, errors } from '@/server/errors/app-error';
import { writeAudit } from '@/server/security/audit';
import type { SessionUser } from '@/server/security/session';

const uuid = z.string().uuid();
export const createOrderSchema = z
  .object({ courseId: uuid.optional(), liveClassId: uuid.optional() })
  .strict()
  .refine((v) => Number(!!v.courseId) + Number(!!v.liveClassId) === 1, { message: 'دقیقاً یکی از courseId یا liveClassId لازم است.' });
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

const orderSelect = {
  id: true, status: true, totalAmount: true, currency: true, createdAt: true,
  items: { select: { id: true, courseId: true, liveClassId: true, unitPrice: true, discount: true } },
} as const;

/** The price ALWAYS comes from the database; the client only names the item. */
export async function createOrder(user: SessionUser, input: CreateOrderInput, ip: string | null) {
  return prisma.$transaction(async (tx) => {
    let amount: number;
    let listPrice: number;
    if (input.courseId) {
      const course = await tx.course.findFirst({
        where: { id: input.courseId, status: 'PUBLISHED', deletedAt: null },
        select: { id: true, price: true, discountPrice: true },
      });
      if (!course) throw errors.notFound('دوره');
      listPrice = course.price;
      amount = course.discountPrice ?? course.price;
      if (await tx.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } }, select: { id: true } })) {
        throw new AppError(409, 'ALREADY_ENROLLED', 'شما قبلاً در این دوره ثبت‌نام کرده‌اید.');
      }
    } else {
      const live = await tx.liveClass.findFirst({
        where: { id: input.liveClassId, deletedAt: null, status: { in: ['SCHEDULED', 'LIVE'] } },
        select: { id: true, price: true },
      });
      if (!live) throw errors.notFound('کلاس');
      listPrice = live.price;
      amount = live.price;
      if (await tx.liveEnrollment.findUnique({ where: { userId_liveClassId: { userId: user.id, liveClassId: live.id } }, select: { id: true } })) {
        throw new AppError(409, 'ALREADY_ENROLLED', 'شما قبلاً در این کلاس ثبت‌نام کرده‌اید.');
      }
    }
    if (amount <= 0) throw new AppError(422, 'FREE_ITEM', 'این مورد رایگان است؛ به‌جای سفارش، ثبت‌نام کنید.');

    // Reuse a recent unpaid order for the same item instead of piling up duplicates.
    const existing = await tx.order.findFirst({
      where: {
        userId: user.id, status: 'PENDING', createdAt: { gt: new Date(Date.now() - 24 * 3_600_000) },
        items: { some: input.courseId ? { courseId: input.courseId } : { liveClassId: input.liveClassId } },
      },
      select: orderSelect,
    });
    if (existing) return existing;

    const order = await tx.order.create({
      data: {
        userId: user.id, totalAmount: amount, currency: 'IRT',
        items: { create: [{ ...(input.courseId ? { courseId: input.courseId } : { liveClassId: input.liveClassId }), unitPrice: listPrice, discount: listPrice - amount }] },
      },
      select: orderSelect,
    });
    await writeAudit(tx, { actorId: user.id, ip, action: 'order.create', entity: 'Order', entityId: order.id, metadata: { amount } });
    return order;
  });
}

export function listOrders(user: SessionUser) {
  return prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { ...orderSelect, payments: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, refId: true, paidAt: true } } },
  });
}
