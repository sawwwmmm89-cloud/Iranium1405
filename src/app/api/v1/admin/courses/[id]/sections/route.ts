import { ok } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { createSection } from '@/server/modules/admin-courses/admin-content.service';
import { sectionSchema } from '@/server/modules/admin-courses/course.schema';
import { adminRoute, clientIp } from '@/server/security/admin-route';

export const POST = adminRoute<{ params: Promise<{ id: string }> }>({}, async (req, { params }, user) => {
  const input = await readBody(req, sectionSchema);
  return ok(await createSection((await params).id, input, { actorId: user.id, ip: clientIp(req) }), 201);
});
