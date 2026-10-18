import { NextResponse } from 'next/server';
import { ok } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { createCourse, listAdminCourses } from '@/server/modules/admin-courses/admin-courses.service';
import { adminCourseListQuerySchema, createCourseSchema } from '@/server/modules/admin-courses/course.schema';
import { adminRoute, clientIp } from '@/server/security/admin-route';

export const GET = adminRoute({}, async (req) => {
  const query = adminCourseListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { items, total } = await listAdminCourses(query);
  return ok(items, 200, { page: query.page, pageSize: query.pageSize, total });
});

export const POST = adminRoute({}, async (req, _ctx, user): Promise<NextResponse> => {
  const input = await readBody(req, createCourseSchema);
  return ok(await createCourse(input, { actorId: user.id, ip: clientIp(req) }), 201);
});
