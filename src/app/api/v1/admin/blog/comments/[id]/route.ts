import { ok } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { deleteComment, moderateComment } from '@/server/modules/blog/blog-admin.service';
import { moderateSchema } from '@/server/modules/blog/blog.schema';
import { adminRoute, clientIp } from '@/server/security/admin-route';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>({}, async (req, { params }, user) => {
  const { status } = await readBody(req, moderateSchema);
  return ok(await moderateComment((await params).id, status, { actorId: user.id, ip: clientIp(req) }));
});
export const DELETE = adminRoute<Ctx>({}, async (req, { params }, user) => ok(await deleteComment((await params).id, { actorId: user.id, ip: clientIp(req) })));
