import { ok, route } from '@/server/errors/route';
import { getCourse } from '@/server/modules/courses/courses.service';

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  return ok(await getCourse(id));
});
