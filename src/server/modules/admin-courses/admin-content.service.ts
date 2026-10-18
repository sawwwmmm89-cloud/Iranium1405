import 'server-only';
import { prisma } from '@/server/db/prisma';
import { AppError, errors } from '@/server/errors/app-error';
import { writeAudit } from '@/server/security/audit';
import type { AdminContext } from './context';
import { parseId, type CreateLessonInput, type SectionInput, type UpdateLessonInput } from './course.schema';
import { applyOrder, assertSameIds } from './ordering';
import { retryOnUnique } from './retry';

const TX_OPTIONS = { timeout: 20_000 } as const;
const sectionSelect = { id: true, courseId: true, title: true, order: true } as const;
const lessonSelect = {
  id: true, sectionId: true, title: true, description: true, videoProvider: true, videoRef: true,
  durationSec: true, order: true, isFreePreview: true, attachmentUrl: true, status: true,
} as const;

/* ------------------------------- sections ------------------------------- */

export function createSection(courseIdRaw: string, input: SectionInput, ctx: AdminContext) {
  const courseId = parseId(courseIdRaw);
  return retryOnUnique('order', () =>
    prisma.$transaction(async (tx) => {
      const course = await tx.course.findFirst({ where: { id: courseId, deletedAt: null }, select: { id: true } });
      if (!course) throw errors.notFound('دوره');
      const last = await tx.courseSection.aggregate({ where: { courseId }, _max: { order: true } });
      const section = await tx.courseSection.create({
        data: { courseId, title: input.title, order: (last._max.order ?? -1) + 1 },
        select: sectionSelect,
      });
      await writeAudit(tx, {
        actorId: ctx.actorId, ip: ctx.ip, action: 'section.create', entity: 'CourseSection',
        entityId: section.id, metadata: { courseId, title: section.title },
      });
      return section;
    }, TX_OPTIONS),
  );
}

export function updateSection(idRaw: string, input: SectionInput, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.courseSection.findFirst({ where: { id, course: { deletedAt: null } }, select: { id: true } });
    if (!existing) throw errors.notFound('فصل');
    const section = await tx.courseSection.update({ where: { id }, data: { title: input.title }, select: sectionSelect });
    await writeAudit(tx, {
      actorId: ctx.actorId, ip: ctx.ip, action: 'section.update', entity: 'CourseSection',
      entityId: id, metadata: { fields: ['title'] },
    });
    return section;
  });
}

/**
 * Sections have no soft delete. schema.prisma declares Lesson.section onDelete: Cascade, which
 * would silently hard-delete lessons, so the DELETE itself is conditional on the section having
 * NO lesson rows at all (soft-deleted lessons count too). One statement => no check-then-delete race.
 */
export function deleteSection(idRaw: string, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.courseSection.deleteMany({ where: { id, lessons: { none: {} } } });
    if (count === 0) {
      const exists = await tx.courseSection.findUnique({ where: { id }, select: { id: true } });
      if (!exists) throw errors.notFound('فصل');
      throw new AppError(409, 'SECTION_NOT_EMPTY', 'این فصل دارای جلسه است. ابتدا جلسه‌ها را حذف یا منتقل کنید.');
    }
    await writeAudit(tx, {
      actorId: ctx.actorId, ip: ctx.ip, action: 'section.delete', entity: 'CourseSection', entityId: id,
    });
    return { id };
  });
}

export function reorderSections(courseIdRaw: string, ids: string[], ctx: AdminContext) {
  const courseId = parseId(courseIdRaw);
  return prisma.$transaction(async (tx) => {
    const course = await tx.course.findFirst({ where: { id: courseId, deletedAt: null }, select: { id: true } });
    if (!course) throw errors.notFound('دوره');
    const current = await tx.courseSection.findMany({ where: { courseId }, select: { id: true } });
    assertSameIds(ids, current.map((s) => s.id));
    await applyOrder(ids, (id, order) => tx.courseSection.update({ where: { id }, data: { order } }));
    await writeAudit(tx, {
      actorId: ctx.actorId, ip: ctx.ip, action: 'course.reorder', entity: 'Course',
      entityId: courseId, metadata: { scope: 'sections', ids },
    });
    return { courseId, ids };
  }, TX_OPTIONS);
}

/* -------------------------------- lessons -------------------------------- */

export function createLesson(sectionIdRaw: string, input: CreateLessonInput, ctx: AdminContext) {
  const sectionId = parseId(sectionIdRaw);
  return retryOnUnique('order', () =>
    prisma.$transaction(async (tx) => {
      const section = await tx.courseSection.findFirst({
        where: { id: sectionId, course: { deletedAt: null } },
        select: { id: true },
      });
      if (!section) throw errors.notFound('فصل');
      // Max over ALL rows (incl. soft-deleted): they still occupy (sectionId, order).
      const last = await tx.lesson.aggregate({ where: { sectionId }, _max: { order: true } });
      const lesson = await tx.lesson.create({
        data: { ...input, sectionId, order: (last._max.order ?? -1) + 1 },
        select: lessonSelect,
      });
      await writeAudit(tx, {
        actorId: ctx.actorId, ip: ctx.ip, action: 'lesson.create', entity: 'Lesson',
        entityId: lesson.id, metadata: { sectionId, title: lesson.title },
      });
      return lesson;
    }, TX_OPTIONS),
  );
}

export function updateLesson(idRaw: string, patch: UpdateLessonInput, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.lesson.findFirst({
      where: { id, deletedAt: null, section: { course: { deletedAt: null } } },
      select: { id: true },
    });
    if (!existing) throw errors.notFound('جلسه');
    const lesson = await tx.lesson.update({ where: { id }, data: patch, select: lessonSelect });
    await writeAudit(tx, {
      actorId: ctx.actorId, ip: ctx.ip, action: 'lesson.update', entity: 'Lesson',
      entityId: id, metadata: { fields: Object.keys(patch) },
    });
    return lesson;
  });
}

/** Soft delete; the row keeps its order slot. */
export function deleteLesson(idRaw: string, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.lesson.findFirst({
      where: { id, deletedAt: null, section: { course: { deletedAt: null } } },
      select: { id: true, sectionId: true },
    });
    if (!existing) throw errors.notFound('جلسه');
    await tx.lesson.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit(tx, {
      actorId: ctx.actorId, ip: ctx.ip, action: 'lesson.delete', entity: 'Lesson',
      entityId: id, metadata: { sectionId: existing.sectionId },
    });
    return { id };
  });
}

/** `ids` = complete list of the section's live lessons in the new order; soft-deleted rows follow. */
export function reorderLessons(sectionIdRaw: string, ids: string[], ctx: AdminContext) {
  const sectionId = parseId(sectionIdRaw);
  return prisma.$transaction(async (tx) => {
    const section = await tx.courseSection.findFirst({
      where: { id: sectionId, course: { deletedAt: null } },
      select: { id: true },
    });
    if (!section) throw errors.notFound('فصل');
    const rows = await tx.lesson.findMany({
      where: { sectionId },
      orderBy: { order: 'asc' },
      select: { id: true, deletedAt: true },
    });
    assertSameIds(ids, rows.filter((r) => r.deletedAt === null).map((r) => r.id));
    const trailing = rows.filter((r) => r.deletedAt !== null).map((r) => r.id);
    await applyOrder([...ids, ...trailing], (id, order) => tx.lesson.update({ where: { id }, data: { order } }));
    await writeAudit(tx, {
      actorId: ctx.actorId, ip: ctx.ip, action: 'lesson.reorder', entity: 'CourseSection',
      entityId: sectionId, metadata: { ids },
    });
    return { sectionId, ids };
  }, TX_OPTIONS);
}
