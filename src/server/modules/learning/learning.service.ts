import 'server-only';
import { prisma } from '@/server/db/prisma';

export interface EnrolledCourse {
  id: string;
  slug: string;
  title: string;
  instructorName: string;
  totalLessons: number;
  completedLessons: number;
  percent: number;
}

export async function listEnrolledCourses(userId: string, take?: number): Promise<EnrolledCourse[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, course: { deletedAt: null } },
    orderBy: { createdAt: 'desc' },
    take,
    select: { course: { select: { id: true, slug: true, title: true, instructor: { select: { name: true } } } } },
  });
  return Promise.all(
    enrollments.map(async ({ course }) => {
      const lessonWhere = { section: { courseId: course.id }, status: 'PUBLISHED' as const, deletedAt: null };
      const [totalLessons, completedLessons] = await Promise.all([
        prisma.lesson.count({ where: lessonWhere }),
        prisma.progress.count({ where: { userId, completed: true, lesson: lessonWhere } }),
      ]);
      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        instructorName: course.instructor.name,
        totalLessons,
        completedLessons,
        percent: totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100),
      };
    }),
  );
}
