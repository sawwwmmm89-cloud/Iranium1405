import { z } from 'zod';
import { assertRateLimit } from '@/lib/rate-limit';
import { ok, route } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { initiatePayment } from '@/server/modules/payments/payments.service';
import { requireUser } from '@/server/security/session';

const bodySchema = z.object({ orderId: z.string().uuid() }).strict();

export const POST = route(async (req) => {
  const user = await requireUser();
  assertRateLimit(`pay-create:${user.id}`, 10, 60_000);
  const { orderId } = await readBody(req, bodySchema);
  return ok(await initiatePayment(user, orderId, req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null));
});
