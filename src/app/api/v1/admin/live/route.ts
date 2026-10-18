import { ok } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { createLive, listAdminLive } from '@/server/modules/live/live.service';
import { createLiveSchema } from '@/server/modules/live/live.schema';
import { adminRoute, clientIp } from '@/server/security/admin-route';

export const GET = adminRoute({}, async () => ok(await listAdminLive()));
export const POST = adminRoute({}, async (req, _ctx, user) => ok(await createLive(await readBody(req, createLiveSchema), { actorId: user.id, ip: clientIp(req) }), 201));
