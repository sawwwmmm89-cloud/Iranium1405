import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { assertRateLimit } from '@/lib/rate-limit';
import { route } from '@/server/errors/route';
import { authoritySchema, settlePayment } from '@/server/modules/payments/payments.service';

/** Browser return from the gateway. Never trusts `Status`: success only comes from the server-side verify. */
export const GET = route(async (req) => {
  assertRateLimit(`pay-callback:${req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'}`, 60, 60_000);
  const authority = authoritySchema.safeParse(req.nextUrl.searchParams.get('Authority'));
  const status = req.nextUrl.searchParams.get('Status') ?? undefined;
  const outcome = authority.success ? (await settlePayment(authority.data, status)).outcome : 'unknown';
  return NextResponse.redirect(new URL(`/dashboard/orders?payment=${outcome}`, getEnv().NEXT_PUBLIC_APP_URL), 303);
});
