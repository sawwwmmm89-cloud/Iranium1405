import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db/prisma', async () => ({ prisma: (await import('../helpers/prisma-mock')).pm.client }));
const notify = vi.hoisted(() => vi.fn());
vi.mock('@/server/modules/sms/notifications', () => ({ notifyPaymentSuccess: notify }));

import { GatewayRejectedError, GatewayUnavailableError, type PaymentProvider } from '@/server/providers/payment/types';
import { initiatePayment, settlePayment } from '@/server/modules/payments/payments.service';
import { pm } from '../helpers/prisma-mock';

process.env.DATABASE_URL = 'postgresql://placeholder';
process.env.AUTH_SECRET = 'x'.repeat(40);
process.env.NEXT_PUBLIC_APP_URL = 'https://bama.test';

const AUTH = 'A00000000000000000000000000123456789';
const USER = '11111111-1111-4111-8111-111111111111';
const ORDER = '22222222-2222-4222-8222-222222222222';
const COURSE = '33333333-3333-4333-8333-333333333333';
const payment = { id: 'pay-1', orderId: ORDER, userId: USER, amount: 1000, status: 'INITIATED' };

const provider = (over: Partial<PaymentProvider> = {}): PaymentProvider & { verify: ReturnType<typeof vi.fn>; request: ReturnType<typeof vi.fn> } =>
  ({ name: 'zarinpal', request: vi.fn(), verify: vi.fn(), ...over }) as never;
const auditActions = () => pm.fn('auditLog.create').mock.calls.map((c) => c[0].data.action);

beforeEach(() => {
  pm.reset();
  notify.mockReset().mockResolvedValue(undefined);
  pm.fn('payment.findUnique').mockResolvedValue(payment);
  pm.fn('auditLog.create').mockResolvedValue({});
  pm.fn('order.updateMany').mockResolvedValue({ count: 1 });
  pm.fn('orderItem.findMany').mockResolvedValue([{ courseId: COURSE, liveClassId: null }]);
  pm.fn('enrollment.createMany').mockResolvedValue({ count: 1 });
});

describe('settlePayment', () => {
  it('verified => PAID, order PAID, enrollment created with skipDuplicates, audited, SMS triggered', async () => {
    const p = provider();
    p.verify.mockResolvedValue({ status: 'verified', refId: '555', alreadyVerified: false });
    pm.fn('payment.updateMany').mockResolvedValue({ count: 1 }); // claim, then PAID
    await expect(settlePayment(AUTH, 'OK', p)).resolves.toEqual({ outcome: 'paid', orderId: ORDER });
    expect(p.verify).toHaveBeenCalledWith({ amountToman: 1000, authority: AUTH }); // amount from DB
    const paid = pm.fn('payment.updateMany').mock.calls[1]?.[0];
    expect(paid.data).toMatchObject({ status: 'PAID', refId: '555' });
    expect(pm.fn('enrollment.createMany').mock.calls[0]?.[0]).toMatchObject({ skipDuplicates: true, data: [{ userId: USER, courseId: COURSE, orderId: ORDER, source: 'PURCHASE' }] });
    expect(auditActions()).toContain('payment.paid');
    await vi.waitFor(() => expect(notify).toHaveBeenCalledWith('pay-1'));
  });
  it('already PAID => idempotent: no gateway call, no second enrollment', async () => {
    pm.fn('payment.findUnique').mockResolvedValue({ ...payment, status: 'PAID' });
    const p = provider();
    await expect(settlePayment(AUTH, 'OK', p)).resolves.toMatchObject({ outcome: 'paid' });
    expect(p.verify).not.toHaveBeenCalled();
    expect(pm.fn('enrollment.createMany')).not.toHaveBeenCalled();
  });
  it('concurrent duplicate callback (claim lost) => pending, no verify', async () => {
    pm.fn('payment.updateMany').mockResolvedValue({ count: 0 });
    const p = provider();
    await expect(settlePayment(AUTH, 'OK', p)).resolves.toMatchObject({ outcome: 'pending' });
    expect(p.verify).not.toHaveBeenCalled();
    expect(pm.fn('enrollment.createMany')).not.toHaveBeenCalled();
  });
  it('lost the race at the PAID step => no enrollment, no SMS', async () => {
    const p = provider();
    p.verify.mockResolvedValue({ status: 'verified', refId: '1', alreadyVerified: true });
    pm.fn('payment.updateMany').mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await settlePayment(AUTH, 'OK', p);
    expect(pm.fn('enrollment.createMany')).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
  it('gateway Status=NOK => FAILED without verifying or enrolling', async () => {
    pm.fn('payment.updateMany').mockResolvedValue({ count: 1 });
    const p = provider();
    await expect(settlePayment(AUTH, 'NOK', p)).resolves.toMatchObject({ outcome: 'failed' });
    expect(pm.fn('payment.updateMany').mock.calls[0]?.[0].data).toEqual({ status: 'FAILED' });
    expect(p.verify).not.toHaveBeenCalled();
    expect(pm.fn('enrollment.createMany')).not.toHaveBeenCalled();
    expect(auditActions()).toContain('payment.cancelled');
  });
  it('Status=OK is NOT trusted: a rejected verify => FAILED, never enrolled', async () => {
    const p = provider();
    p.verify.mockResolvedValue({ status: 'rejected', code: -50 });
    pm.fn('payment.updateMany').mockResolvedValue({ count: 1 });
    await expect(settlePayment(AUTH, 'OK', p)).resolves.toMatchObject({ outcome: 'failed' });
    expect(pm.fn('enrollment.createMany')).not.toHaveBeenCalled();
    expect(auditActions()).toContain('payment.failed');
  });
  it('gateway unreachable => pending (stays VERIFY_PENDING), never PAID', async () => {
    const p = provider();
    p.verify.mockRejectedValue(new GatewayUnavailableError('down'));
    pm.fn('payment.updateMany').mockResolvedValue({ count: 1 });
    await expect(settlePayment(AUTH, 'OK', p)).resolves.toMatchObject({ outcome: 'pending' });
    expect(pm.fn('payment.updateMany')).toHaveBeenCalledTimes(1); // only the claim
    expect(pm.fn('enrollment.createMany')).not.toHaveBeenCalled();
  });
  it('unknown authority => unknown; missing provider => 503', async () => {
    pm.fn('payment.findUnique').mockResolvedValue(null);
    await expect(settlePayment(AUTH, 'OK', provider())).resolves.toEqual({ outcome: 'unknown' });
    pm.fn('payment.findUnique').mockResolvedValue(payment);
    await expect(settlePayment(AUTH, 'OK', null)).rejects.toMatchObject({ status: 503, code: 'PAYMENT_NOT_CONFIGURED' });
  });
});

describe('initiatePayment', () => {
  const user = { id: USER, email: 'a@b.c', name: 'a', role: 'STUDENT' as const };
  it('503 when not configured', async () => {
    await expect(initiatePayment(user, ORDER, null, null)).rejects.toMatchObject({ status: 503, code: 'PAYMENT_NOT_CONFIGURED' });
  });
  it("404 for someone else's order and 409 for a non-pending one", async () => {
    pm.fn('order.findFirst').mockResolvedValue(null);
    await expect(initiatePayment(user, ORDER, null, provider())).rejects.toMatchObject({ status: 404 });
    expect(pm.fn('order.findFirst').mock.calls[0]?.[0].where).toEqual({ id: ORDER, userId: USER });
    pm.fn('order.findFirst').mockResolvedValue({ id: ORDER, status: 'PAID', totalAmount: 1000 });
    await expect(initiatePayment(user, ORDER, null, provider())).rejects.toMatchObject({ status: 409, code: 'ORDER_NOT_PAYABLE' });
  });
  it('amount comes from the order; stores authority; returns the gateway url', async () => {
    pm.fn('order.findFirst').mockResolvedValue({ id: ORDER, status: 'PENDING', totalAmount: 4200 });
    pm.fn('payment.create').mockResolvedValue({ id: 'pay-9' });
    const p = provider();
    p.request.mockResolvedValue({ authority: AUTH, paymentUrl: 'https://gw.test/pay' });
    await expect(initiatePayment(user, ORDER, '1.2.3.4', p)).resolves.toEqual({ paymentId: 'pay-9', paymentUrl: 'https://gw.test/pay' });
    expect(p.request).toHaveBeenCalledWith(expect.objectContaining({ amountToman: 4200, callbackUrl: 'https://bama.test/api/v1/payments/zarinpal/callback' }));
    expect(pm.fn('payment.create').mock.calls[0]?.[0].data).toMatchObject({ orderId: ORDER, userId: USER, authority: AUTH, amount: 4200, status: 'INITIATED' });
  });
  it('gateway refusal/outage => 502 and no Payment row', async () => {
    pm.fn('order.findFirst').mockResolvedValue({ id: ORDER, status: 'PENDING', totalAmount: 1 });
    const rejected = provider();
    rejected.request.mockRejectedValue(new GatewayRejectedError(-9));
    await expect(initiatePayment(user, ORDER, null, rejected)).rejects.toMatchObject({ status: 502, code: 'PAYMENT_GATEWAY_REJECTED' });
    const down = provider();
    down.request.mockRejectedValue(new GatewayUnavailableError('x'));
    await expect(initiatePayment(user, ORDER, null, down)).rejects.toMatchObject({ status: 502, code: 'PAYMENT_GATEWAY_UNAVAILABLE' });
    expect(pm.fn('payment.create')).not.toHaveBeenCalled();
  });
});
