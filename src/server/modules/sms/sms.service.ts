import 'server-only';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { assertRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/server/db/prisma';
import { AppError } from '@/server/errors/app-error';
import { getSmsProvider } from '@/server/providers/sms';
import type { SmsProvider } from '@/server/providers/sms/types';
import { normalizeIranMobile } from './phone';

const MAX_ATTEMPTS = 3;
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface SendSmsInput {
  userId?: string | null;
  to: string;
  body: string;
  /** Same key => at most one message ever (prevents duplicate sends on retries/callbacks). */
  dedupeKey: string;
}

export async function sendSms(input: SendSmsInput, deps: { provider?: SmsProvider | null; sleep?: (ms: number) => Promise<void> } = {}) {
  const provider = deps.provider === undefined ? getSmsProvider() : deps.provider;
  const sleep = deps.sleep ?? defaultSleep;
  const phone = normalizeIranMobile(input.to);
  if (!phone) throw new AppError(422, 'INVALID_PHONE', 'شمارهٔ موبایل نامعتبر است.');

  let row;
  try {
    row = await prisma.smsMessage.create({
      data: {
        userId: input.userId ?? null, toPhone: phone, body: input.body, dedupeKey: input.dedupeKey,
        status: provider ? 'QUEUED' : 'SKIPPED', lastError: provider ? null : 'SMS_NOT_CONFIGURED',
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.smsMessage.findUnique({ where: { dedupeKey: input.dedupeKey }, select: { id: true, status: true } });
      return { id: existing?.id, status: existing?.status ?? 'SKIPPED', duplicate: true };
    }
    throw error;
  }
  if (!provider) return { id: row.id, status: row.status, duplicate: false };

  assertRateLimit(`sms:${phone}`, 5, 3_600_000);
  let lastError = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await provider.send({ to: phone, text: input.body });
      await prisma.smsMessage.update({ where: { id: row.id }, data: { status: 'SENT', attempts: attempt, providerRef: res.providerRef ?? null, sentAt: new Date(), lastError: null } });
      return { id: row.id, status: 'SENT' as const, duplicate: false };
    } catch (error) {
      lastError = (error as Error).message.slice(0, 200); // message only: never log request bodies/keys
      logger.warn('sms_send_failed', { smsId: row.id, attempt });
      if (attempt < MAX_ATTEMPTS) await sleep(300 * 2 ** (attempt - 1));
    }
  }
  await prisma.smsMessage.update({ where: { id: row.id }, data: { status: 'FAILED', attempts: MAX_ATTEMPTS, lastError } });
  return { id: row.id, status: 'FAILED' as const, duplicate: false };
}
