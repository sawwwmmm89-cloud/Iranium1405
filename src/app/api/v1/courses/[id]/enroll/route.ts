import { prisma } from '@/server/db/prisma';
import { AppError, errors } from '@/server/errors/app-error';
import { ok, route } from '@/server/errors/route';
import { parseId } from '@/server/modules/admin-courses/course.schema';
import { writeAudit } from '@/server/security/audit';
import { requireUser } from '@/server/security/session';

/** Free courses only (effective price 0). Paid courses go through /orders + the payment gateway. Idempotent. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser();
  const courseId = parseId((await params).id);
  return prisma.$transaction(async (tx) => {
    const course = await tx.course.findFirst({
      where: { id: courseId, status: 'PUBLISHED', deletedAt: null },
      select: { id: true, price: true, discountPrice: true },
    });
    if (!course) throw errors.notFound('دوره');
    if ((course.discountPrice ?? course.price) > 0) {
      throw new AppError(402, 'PAYMENT_REQUIRED', 'این دوره پولی است. ابتدا سفارش ایجاد و پرداخت کنید.');
    }
    const { count } = await tx.enrollment.createMany({
      data: [{ userId: user.id, courseId, source: 'FREE' }],
      skipDuplicates: true,
    });
    if (count === 1) {
      await writeAudit(tx, {
        actorId: user.id, ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        action: 'enrollment.create', entity: 'Course', entityId: courseId, metadata: { source: 'FREE' },
      });
    }
    return ok({ enrolled: true, created: count === 1 });
  });
});
