import 'server-only';
import { prisma } from '@/server/db/prisma';
import { errors } from '@/server/errors/app-error';
import { ADMIN_ROLES, type SessionUser } from '@/server/security/session';

export interface LessonAccess {
  lessonId: string;
  courseId: string;
  canManage: boolean;
  canView: boolean;
}

/** Admins manage everything; an INSTRUCTOR manages only courses of their own Instructor profile. */
export async function canManageCourse(user: SessionUser, courseId: string): Promise<boolean> {
  if (ADMIN_ROLES.includes(user.role)) return true;
  if (user.role !== 'INSTRUCTOR') return false;
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null, instructor: { userId: user.id } },
    select: { id: true },
  });
  return !!course;
}

/**
 * Single source of truth for lesson/attachment access:
 * manage rights, or (published lesson in a published course) AND (free preview OR enrolled).
 */
export async function resolveLessonAccess(user: SessionUser, lessonId: string): Promise<LessonAccess> {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null, section: { course: { deletedAt: null } } },
    select: {
      id: true,
      status: true,
      isFreePreview: true,
      section: { select: { courseId: true, course: { select: { status: true } } } },
    },
  });
  if (!lesson) throw errors.notFound('جلسه');
  const courseId = lesson.section.courseId;
  const canManage = await canManageCourse(user, courseId);
  let canView = canManage;
  if (!canView && lesson.status === 'PUBLISHED' && lesson.section.course.status === 'PUBLISHED') {
    if (lesson.isFreePreview) canView = true;
    else {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId } },
        select: { id: true },
      });
      canView = !!enrollment;
    }
  }
  return { lessonId: lesson.id, courseId, canManage, canView };
}
