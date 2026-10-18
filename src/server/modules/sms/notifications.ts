import 'server-only';
import { prisma } from '@/server/db/prisma';
import { sendSms } from './sms.service';

/** Best-effort: the caller must not fail a payment because an SMS could not be sent. */
export async function notifyPaymentSuccess(paymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, refId: true, userId: true, user: { select: { phone: true } } },
  });
  if (!payment?.user.phone) return;
  await sendSms({
    userId: payment.userId,
    to: payment.user.phone,
    body: `پرداخت شما در باما با موفقیت انجام شد. کد پیگیری: ${payment.refId ?? '-'}`,
    dedupeKey: `payment-paid:${payment.id}`,
  });
}
