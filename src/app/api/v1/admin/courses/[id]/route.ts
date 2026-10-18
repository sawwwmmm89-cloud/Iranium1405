import { ok } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { deleteCourse, getAdminCourse, updateCourse } from '@/server/modules/admin-courses/admin-courses.service';
import { updateCourseSchema } from '@/server/modules/admin-courses/course.schema';
import { adminRoute, clientIp } from '@/server/security/admin-route';

type Ctx = { params: Promise<{ id: string }> };

export const GET = adminRoute<Ctx>({}, async (_req, { params }) => ok(await getAdminCourse((await params).id)));

export const PATCH = adminRoute<Ctx>({}, async (req, { params }, user) => {
  const patch = await readBody(req, updateCourseSchema);
  return ok(await updateCourse((await params).id, patch, { actorId: user.id, ip: clientIp(req) }));
});

export const DELETE = adminRoute<Ctx>({}, async (req, { params }, user) =>
  ok(await deleteCourse((await params).id, { actorId: user.id, ip: clientIp(req) })),
);
