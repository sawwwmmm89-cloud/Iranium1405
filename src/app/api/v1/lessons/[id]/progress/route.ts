import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
import { errors } from '@/server/errors/app-error';
import { ok, route } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { resolveLessonAccess } from '@/server/modules/access/access.service';
import { parseId } from '@/server/modules/admin-courses/course.schema';
import { requireUser } from '@/server/security/session';

const bodySchema = z
  .object({ completed: z.boolean().optional(), watchedSec: z.number().int().min(0).max(2_147_483_647).optional() })
  .strict()
  .refine((v) => v.completed !== undefined || v.watchedSec !== undefined, { message: 'حداقل یک فیلد لازم است.' });

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser();
  const lessonId = parseId((await params).id);
  const input = await readBody(req, bodySchema);
  const access = await resolveLessonAccess(user, lessonId);
  if (!access.canView) throw errors.forbidden();
  const progress = await prisma.progress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    create: {
      userId: user.id, lessonId, completed: input.completed ?? false, watchedSec: input.watchedSec ?? 0,
      completedAt: input.completed ? new Date() : null,
    },
    update: {
      ...(input.watchedSec !== undefined ? { watchedSec: input.watchedSec } : {}),
      ...(input.completed !== undefined ? { completed: input.completed, completedAt: input.completed ? new Date() : null } : {}),
    },
    select: { lessonId: true, completed: true, watchedSec: true, completedAt: true },
  });
  return ok(progress);
});
