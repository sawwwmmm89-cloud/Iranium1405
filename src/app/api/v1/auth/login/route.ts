import { ok, route } from '@/server/errors/route';
import { loginSchema } from '@/server/modules/auth/auth.schema';
import { authenticate } from '@/server/modules/auth/auth.service';
import { createSession } from '@/server/security/session';

export const POST = route(async (req) => {
  const input = loginSchema.parse(await req.json().catch(() => ({})));
  const user = await authenticate(input);
  await createSession(user.id);
  return ok(user);
});
