import { ok, route } from '@/server/errors/route';
import { listCourses, listQuerySchema } from '@/server/modules/courses/courses.service';

export const GET = route(async (req) => {
  const query = listQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { items, total } = await listCourses(query);
  return ok(items, 200, { page: query.page, pageSize: query.pageSize, total });
});
