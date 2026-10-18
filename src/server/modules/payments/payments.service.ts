import 'server-only';
import { z } from 'zod';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/server/db/prisma';
import { AppError, errors } from '@/server/errors/app-error';
import { GatewayRejectedError, type PaymentProvider, type PaymentRequestResult, type VerifyResult } from '@/server/providers/payment/types';
import { getPaymentProvider } from '@/server/providers/payment';
import { writeAudit } from '@/server/security/audit';
import type { SessionUser } from '@/server/security/session';
import { notifyPaymentSuccess } from '@/server/modules/sms/notifications';

export const authoritySchema = z.string().regex(/^[A-Za-z0-9]{10,64}$/);
export const verifyBodySchema = z.object({ authority: authoritySchema }).strict();
const RECLAIM_AFTER_MS = 60_000;

export type SettleOutcome = 'paid' | 'failed' | 'pending' | 'unknown';
export interface SettleResult {
  outcome: SettleOutcome;
  orderId?: string;
}

export async function initiatePayment(user: SessionUser, orderId: string, ip: string | null, provider: PaymentProvider | null = getPaymentProvider()) {
  if (!provider) throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'درگاه پرداخت پیکربندی نشده است.');
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id }, select: { id: true, status: true, totalAmount: true } });
  if (!order) throw errors.notFound('سفارش');
  if (order.status !== 'PENDING') throw new AppError(409, 'ORDER_NOT_PAYABLE', 'این سفارش قابل پرداخت نیست.');

  let result: PaymentRequestResult;
  try {
    result = await provider.request({
      amountToman: order.totalAmount,
      callbackUrl: `${getEnv().NEXT_PUBLIC_APP_URL}/api/v1/payments/zarinpal/callback`,
      description: `سفارش ${order.id}`,
    });
  } catch (error) {
    if (error instanceof GatewayRejectedError) {
      logger.warn('payment_request_rejected', { orderId, code: error.code });
      throw new AppError(502, 'PAYMENT_GATEWAY_REJECTED', 'درگاه پرداخت درخواست را نپذیرفت.');
    }
    logger.error('payment_request_failed', { orderId, error });
    throw new AppError(502, 'PAYMENT_GATEWAY_UNAVAILABLE', 'ارتباط با درگاه پرداخت برقرار نشد. دوباره تلاش کنید.');
  }
  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: { orderId: order.id, userId: user.id, provider: provider.name, authority: result.authority, amount: order.totalAmount, status: 'INITIATED' },
      select: { id: true },
    });
    await writeAudit(tx, { actorId: user.id, ip, action: 'payment.initiate', entity: 'Payment', entityId: p.id, metadata: { orderId: order.id, amount: order.totalAmount } });
    return p;
  });
  return { paymentId: payment.id, paymentUrl: result.paymentUrl };
}

/**
 * The ONLY place a purchase becomes real. The gateway redirect/Status is never trusted: success requires a
 * server-side verify. Concurrency/idempotency: a status-guarded UPDATE "claims" the payment, and the final
 * PAID transition is guarded again, so duplicate callbacks, retries and double clicks cannot double-enroll.
 */
export async function settlePayment(authority: string, gatewayStatus?: string, provider: PaymentProvider | null = getPaymentProvider()): Promise<SettleResult> {
  const payment = await prisma.payment.findUnique({
    where: { authority },
    select: { id: true, orderId: true, userId: true, amount: true, status: true },
  });
  if (!payment) return { outcome: 'unknown' };
  const base = { orderId: payment.orderId };
  if (payment.status === 'PAID') return { outcome: 'paid', ...base };
  if (payment.status === 'FAILED') return { outcome: 'failed', ...base };

  if (gatewayStatus === 'NOK') {
    const { count } = await prisma.payment.updateMany({ where: { id: payment.id, status: 'INITIATED' }, data: { status: 'FAILED' } });
    if (count === 1) {
      await prisma.$transaction((tx) => writeAudit(tx, { actorId: payment.userId, action: 'payment.cancelled', entity: 'Payment', entityId: payment.id }));
    }
    return { outcome: 'failed', ...base };
  }

  if (!provider) throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'درگاه پرداخت پیکربندی نشده است.');
  const claim = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      OR: [{ status: 'INITIATED' }, { status: 'VERIFY_PENDING', updatedAt: { lt: new Date(Date.now() - RECLAIM_AFTER_MS) } }],
    },
    data: { status: 'VERIFY_PENDING' },
  });
  if (claim.count === 0) return { outcome: 'pending', ...base }; // another request is verifying right now

  let verdict: VerifyResult;
  try {
    verdict = await provider.verify({ amountToman: payment.amount, authority });
  } catch (error) {
    logger.error('payment_verify_unavailable', { paymentId: payment.id, error }); // outcome unknown: stay VERIFY_PENDING, retried later
    return { outcome: 'pending', ...base };
  }

  if (verdict.status === 'rejected') {
    const code = verdict.code;
    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({ where: { id: payment.id, status: 'VERIFY_PENDING' }, data: { status: 'FAILED', rawVerifyResponse: { code } } });
      await writeAudit(tx, { actorId: payment.userId, action: 'payment.failed', entity: 'Payment', entityId: payment.id, metadata: { code } });
    });
    return { outcome: 'failed', ...base };
  }
  const { refId, alreadyVerified } = verdict;

  const settled = await prisma.$transaction(async (tx) => {
    const paid = await tx.payment.updateMany({
      where: { id: payment.id, status: 'VERIFY_PENDING' },
      data: { status: 'PAID', refId, paidAt: new Date(), rawVerifyResponse: { refId, alreadyVerified } },
    });
    if (paid.count === 0) return false; // lost a race: someone else already finalized it
    await tx.order.updateMany({ where: { id: payment.orderId, status: 'PENDING' }, data: { status: 'PAID' } });
    const items = await tx.orderItem.findMany({ where: { orderId: payment.orderId }, select: { courseId: true, liveClassId: true } });
    const courseIds = items.flatMap((i) => (i.courseId ? [i.courseId] : []));
    const liveIds = items.flatMap((i) => (i.liveClassId ? [i.liveClassId] : []));
    if (courseIds.length) {
      await tx.enrollment.createMany({
        data: courseIds.map((courseId) => ({ userId: payment.userId, courseId, orderId: payment.orderId, source: 'PURCHASE' as const })),
        skipDuplicates: true,
      });
    }
    if (liveIds.length) {
      await tx.liveEnrollment.createMany({ data: liveIds.map((liveClassId) => ({ userId: payment.userId, liveClassId })), skipDuplicates: true });
    }
    await writeAudit(tx, { actorId: payment.userId, action: 'payment.paid', entity: 'Payment', entityId: payment.id, metadata: { orderId: payment.orderId, refId } });
    return true;
  });
  if (settled) void notifyPaymentSuccess(payment.id).catch((e: unknown) => logger.error('payment_sms_failed', { paymentId: payment.id, error: e }));
  return { outcome: 'paid', ...base };
}

/** Manual verify (POST .../verify): only the payer or an admin, and it goes through the same settle path. */
export async function verifyForUser(user: SessionUser, authority: string) {
  const payment = await prisma.payment.findUnique({ where: { authority }, select: { userId: true } });
  if (!payment) throw errors.notFound('پرداخت');
  if (payment.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') throw errors.forbidden();
  return settlePayment(authority);
}
