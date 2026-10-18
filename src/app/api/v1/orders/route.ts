import { assertRateLimit } from '@/lib/rate-limit';
import { ok, route } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { createOrder, createOrderSchema, listOrders } from '@/server/modules/orders/orders.service';
import { requireUser } from '@/server/security/session';

export const GET = route(async () => ok(await listOrders(await requireUser())));

export const POST = route(async (req) => {
  const user = await requireUser();
  assertRateLimit(`order:${user.id}`, 20, 60_000);
  const input = await readBody(req, createOrderSchema);
  return ok(await createOrder(user, input, req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null), 201);
});
