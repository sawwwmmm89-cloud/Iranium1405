import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db/prisma', async () => ({ prisma: (await import('../helpers/prisma-mock')).pm.client }));

import { resetRateLimits } from '@/lib/rate-limit';
import { sendSms } from '@/server/modules/sms/sms.service';
import type { SmsProvider } from '@/server/providers/sms/types';
import { pm } from '../helpers/prisma-mock';

const input = { to: '0912 345 6789', body: 'سلام', dedupeKey: 'k1' };
const sleep = vi.fn().mockResolvedValue(undefined);
const fakeProvider = (send: SmsProvider['send']): SmsProvider => ({ name: 'fake', send });

beforeEach(() => {
  pm.reset();
  sleep.mockClear();
  resetRateLimits();
  pm.fn('smsMessage.create').mockResolvedValue({ id: 's1', status: 'QUEUED' });
  pm.fn('smsMessage.update').mockResolvedValue({});
});

describe('sendSms', () => {
  it('422 for invalid phone numbers', async () => {
    await expect(sendSms({ ...input, to: '123' }, { provider: null })).rejects.toMatchObject({ status: 422 });
  });
  it('not configured => stored as SKIPPED, nothing sent', async () => {
    pm.fn('smsMessage.create').mockResolvedValue({ id: 's1', status: 'SKIPPED' });
    await expect(sendSms(input, { provider: null })).resolves.toMatchObject({ status: 'SKIPPED' });
    expect(pm.fn('smsMessage.create').mock.calls[0]?.[0].data).toMatchObject({ status: 'SKIPPED', lastError: 'SMS_NOT_CONFIGURED', toPhone: '09123456789' });
  });
  it('same dedupeKey => no second send', async () => {
    pm.fn('smsMessage.create').mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 't' }));
    pm.fn('smsMessage.findUnique').mockResolvedValue({ id: 's0', status: 'SENT' });
    const send = vi.fn();
    await expect(sendSms(input, { provider: fakeProvider(send) })).resolves.toMatchObject({ duplicate: true, status: 'SENT' });
    expect(send).not.toHaveBeenCalled();
  });
  it('sends once and records SENT', async () => {
    const send = vi.fn().mockResolvedValue({ providerRef: 'r1' });
    await expect(sendSms(input, { provider: fakeProvider(send), sleep })).resolves.toMatchObject({ status: 'SENT' });
    expect(send).toHaveBeenCalledWith({ to: '09123456789', text: 'سلام' });
    expect(pm.fn('smsMessage.update').mock.calls[0]?.[0].data).toMatchObject({ status: 'SENT', attempts: 1, providerRef: 'r1' });
  });
  it('controlled retry with backoff, then success', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('t1')).mockRejectedValueOnce(new Error('t2')).mockResolvedValue({});
    await expect(sendSms(input, { provider: fakeProvider(send), sleep })).resolves.toMatchObject({ status: 'SENT' });
    expect(send).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([300, 600]);
  });
  it('gives up after 3 attempts => FAILED with a truncated error', async () => {
    const send = vi.fn().mockRejectedValue(new Error('x'.repeat(500)));
    await expect(sendSms(input, { provider: fakeProvider(send), sleep })).resolves.toMatchObject({ status: 'FAILED' });
    expect(send).toHaveBeenCalledTimes(3);
    const data = pm.fn('smsMessage.update').mock.calls.at(-1)?.[0].data;
    expect(data).toMatchObject({ status: 'FAILED', attempts: 3 });
    expect(String(data.lastError).length).toBeLessThanOrEqual(200);
  });
});
