import { ok, route } from '@/server/errors/route';
import { prisma } from '@/server/db/prisma';
import { getCourse } from '@/server/modules/courses/courses.service';
import { requireUser } from '@/server/security/session';

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const course = await getCourse((await params).id);
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    select: { id: true },
  });
  return ok({ hasAccess: !!enrollment });
});
