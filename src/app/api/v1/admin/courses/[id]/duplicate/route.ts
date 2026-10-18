import { ok } from '@/server/errors/route';
import { duplicateCourse } from '@/server/modules/admin-courses/admin-courses.service';
import { adminRoute, clientIp } from '@/server/security/admin-route';

export const POST = adminRoute<{ params: Promise<{ id: string }> }>({}, async (req, { params }, user) =>
  ok(await duplicateCourse((await params).id, { actorId: user.id, ip: clientIp(req) }), 201),
);
