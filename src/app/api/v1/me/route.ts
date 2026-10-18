import { ok, route } from '@/server/errors/route';
import { requireUser } from '@/server/security/session';

export const GET = route(async () => ok(await requireUser()));
