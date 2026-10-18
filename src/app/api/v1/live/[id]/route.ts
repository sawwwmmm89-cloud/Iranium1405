import { prisma } from '@/server/db/prisma';
import { errors } from '@/server/errors/app-error';
import { ok, route } from '@/server/errors/route';
import { parseId } from '@/server/modules/admin-courses/course.schema';

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const live = await prisma.liveClass.findFirst({
    where: { id: parseId((await params).id), deletedAt: null },
    select: { id: true, title: true, description: true, thumbnail: true, startsAt: true, durationMin: true, capacity: true, price: true, status: true, instructor: { select: { name: true } } },
  });
  if (!live) throw errors.notFound('کلاس');
  return ok(live);
});
