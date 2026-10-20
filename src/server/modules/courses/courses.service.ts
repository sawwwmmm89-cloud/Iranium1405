import 'server-only';
import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
import { errors } from '@/server/errors/app-error';
import { getSessionUser } from '@/server/security/session';

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
});

export async function listCourses(query: z.infer<typeof listQuerySchema>) {
  const where = {
    status: 'PUBLISHED' as const,
    deletedAt: null,
    ...(query.q ? { title: { contains: query.q, mode: 'insensitive' as const } } : {}),
    ...(query.category ? { category: { slug: query.category } } : {}),
  };
  try {
    const [items, total] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          shortDesc: true,
          thumbnail: true,
          price: true,
          discountPrice: true,
          level: true,
          durationMin: true,
          instructor: { select: { name: true } },
        },
      }),
      prisma.course.count({ where }),
    ]);
    return { items, total };
  } catch (error) {
    console.error('[bama] courses unavailable:', error);
    return { items: [], total: 0 };
  }
}

export async function getCourse(idOrSlug: string) {
  const isUuid = z.string().uuid().safeParse(idOrSlug).success;
  const course = await prisma.course.findFirst({
    where: {
      status: 'PUBLISHED',
      deletedAt: null,
      ...(isUuid ? { id: idOrSlug } : { slug: idOrSlug }),
    },
    include: {
      instructor: { select: { name: true, bio: true } },
      category: { select: { name: true, slug: true } },
    },
  });
  if (!course) throw errors.notFound('دوره');
  return course;
}

/** Lesson list never exposes video provider/ref. */
export async function listLessons(idOrSlug: string) {
  const course = await getCourse(idOrSlug);
  const user = await getSessionUser();
  const enrolled = user
    ? !!(await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      }))
    : false;
  const sections = await prisma.courseSection.findMany({
    where: { courseId: course.id },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      order: true,
      lessons: {
        where: { status: 'PUBLISHED', deletedAt: null },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          durationSec: true,
          order: true,
          isFreePreview: true,
        },
      },
    },
  });
  return { enrolled, sections };
}
