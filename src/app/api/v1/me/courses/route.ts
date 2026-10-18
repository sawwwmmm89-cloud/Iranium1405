import { ok, route } from '@/server/errors/route';
import { prisma } from '@/server/db/prisma';
import { requireUser } from '@/server/security/session';

export const GET = route(async () => {
  const user = await requireUser();
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id, course: { deletedAt: null } },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      course: { select: { id: true, slug: true, title: true, thumbnail: true, instructor: { select: { name: true } } } },
    },
  });
  return ok(enrollments);
});
