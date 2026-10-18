import { ok } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { createLesson } from '@/server/modules/admin-courses/admin-content.service';
import { createLessonSchema } from '@/server/modules/admin-courses/course.schema';
import { adminRoute, clientIp } from '@/server/security/admin-route';

export const POST = adminRoute<{ params: Promise<{ id: string }> }>({}, async (req, { params }, user) => {
  const input = await readBody(req, createLessonSchema);
  return ok(await createLesson((await params).id, input, { actorId: user.id, ip: clientIp(req) }), 201);
});
