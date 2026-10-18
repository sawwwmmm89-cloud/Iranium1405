import { ok } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { deleteLesson, updateLesson } from '@/server/modules/admin-courses/admin-content.service';
import { updateLessonSchema } from '@/server/modules/admin-courses/course.schema';
import { adminRoute, clientIp } from '@/server/security/admin-route';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>({}, async (req, { params }, user) => {
  const patch = await readBody(req, updateLessonSchema);
  return ok(await updateLesson((await params).id, patch, { actorId: user.id, ip: clientIp(req) }));
});

export const DELETE = adminRoute<Ctx>({}, async (req, { params }, user) =>
  ok(await deleteLesson((await params).id, { actorId: user.id, ip: clientIp(req) })),
);
