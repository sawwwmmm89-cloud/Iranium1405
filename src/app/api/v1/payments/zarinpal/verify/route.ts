import { ok, route } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { verifyBodySchema, verifyForUser } from '@/server/modules/payments/payments.service';
import { requireUser } from '@/server/security/session';

export const POST = route(async (req) => {
  const user = await requireUser();
  const { authority } = await readBody(req, verifyBodySchema);
  return ok(await verifyForUser(user, authority));
});
