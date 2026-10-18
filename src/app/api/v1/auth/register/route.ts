import { ok, route } from '@/server/errors/route';
import { registerSchema } from '@/server/modules/auth/auth.schema';
import { registerUser } from '@/server/modules/auth/auth.service';
import { createSession } from '@/server/security/session';

export const POST = route(async (req) => {
  const input = registerSchema.parse(await req.json().catch(() => ({})));
  const user = await registerUser(input);
  await createSession(user.id);
  return ok(user, 201);
});
