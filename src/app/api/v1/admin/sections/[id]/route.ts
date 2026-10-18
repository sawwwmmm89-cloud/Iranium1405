import { ok } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { deleteSection, updateSection } from '@/server/modules/admin-courses/admin-content.service';
import { sectionSchema } from '@/server/modules/admin-courses/course.schema';
import { adminRoute, clientIp } from '@/server/security/admin-route';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>({}, async (req, { params }, user) => {
  const input = await readBody(req, sectionSchema);
  return ok(await updateSection((await params).id, input, { actorId: user.id, ip: clientIp(req) }));
});

export const DELETE = adminRoute<Ctx>({}, async (req, { params }, user) =>
  ok(await deleteSection((await params).id, { actorId: user.id, ip: clientIp(req) })),
);
