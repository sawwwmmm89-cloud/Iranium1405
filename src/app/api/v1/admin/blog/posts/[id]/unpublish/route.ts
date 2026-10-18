import { ok } from '@/server/errors/route';
import { setPostPublished } from '@/server/modules/blog/blog-admin.service';
import { adminRoute, clientIp } from '@/server/security/admin-route';

export const POST = adminRoute<{ params: Promise<{ id: string }> }>({}, async (req, { params }, user) =>
  ok(await setPostPublished((await params).id, false, { actorId: user.id, ip: clientIp(req) })),
);
