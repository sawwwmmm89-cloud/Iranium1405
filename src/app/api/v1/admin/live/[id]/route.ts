import { ok } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { deleteLive, updateLive } from '@/server/modules/live/live.service';
import { updateLiveSchema } from '@/server/modules/live/live.schema';
import { adminRoute, clientIp } from '@/server/security/admin-route';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>({}, async (req, { params }, user) => ok(await updateLive((await params).id, await readBody(req, updateLiveSchema), { actorId: user.id, ip: clientIp(req) })));
export const DELETE = adminRoute<Ctx>({}, async (req, { params }, user) => ok(await deleteLive((await params).id, { actorId: user.id, ip: clientIp(req) })));
