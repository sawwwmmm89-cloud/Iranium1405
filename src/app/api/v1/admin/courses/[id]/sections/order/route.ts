import { ok } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { reorderSections } from '@/server/modules/admin-courses/admin-content.service';
import { reorderSchema } from '@/server/modules/admin-courses/course.schema';
import { adminRoute, clientIp } from '@/server/security/admin-route';

export const PUT = adminRoute<{ params: Promise<{ id: string }> }>({}, async (req, { params }, user) => {
  const { ids } = await readBody(req, reorderSchema);
  return ok(await reorderSections((await params).id, ids, { actorId: user.id, ip: clientIp(req) }));
});
