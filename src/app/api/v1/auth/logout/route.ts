import { ok, route } from '@/server/errors/route';
import { destroySession } from '@/server/security/session';

export const POST = route(async () => {
  await destroySession();
  return ok({ loggedOut: true });
});
