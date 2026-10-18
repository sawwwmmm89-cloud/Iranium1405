import { ok } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { liveStatusSchema } from '@/server/modules/live/live.schema';
import { setLiveStatus } from '@/server/modules/live/live.service';
import { adminRoute, clientIp } from '@/server/security/admin-route';

export const POST = adminRoute<{ params: Promise<{ id: string }> }>({}, async (req, { params }, user) => {
  const { status } = await readBody(req, liveStatusSchema);
  return ok(await setLiveStatus((await params).id, status, { actorId: user.id, ip: clientIp(req) }));
});
