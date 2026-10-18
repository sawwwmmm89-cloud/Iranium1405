import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { AppError, errors } from '@/server/errors/app-error';
import { writeAudit } from '@/server/security/audit';
import type { AdminContext } from './context';
import {
  assertPricing,
  parseId,
  type AdminCourseListQuery,
  type CreateCourseInput,
  type UpdateCourseInput,
} from './course.schema';
import { retryOnUnique } from './retry';
import { generateUniqueSlug } from './slug';

const TX_OPTIONS = { timeout: 20_000 } as const;

export const adminCourseSelect = {
  id: true, slug: true, title: true, shortDesc: true, description: true,
  thumbnail: true, cover: true, price: true, discountPrice: true,
  instructorId: true, categoryId: true, level: true, durationMin: true,
  status: true, featured: true, seoTitle: true, seoDescription: true,
  createdAt: true, updatedAt: true,
} as const;

async function assertReferences(
  tx: Prisma.TransactionClient,
  refs: { instructorId?: string; categoryId?: string },
): Promise<void> {
  if (refs.instructorId) {
    const found = await tx.instructor.findUnique({ where: { id: refs.instructorId }, select: { id: true } });
    if (!found) throw new AppError(422, 'INVALID_REFERENCE', 'مدرس انتخاب‌شده وجود ندارد.', { instructorId: ['نامعتبر'] });
  }
  if (refs.categoryId) {
    const found = await tx.category.findUnique({ where: { id: refs.categoryId }, select: { id: true } });
    if (!found) throw new AppError(422, 'INVALID_REFERENCE', 'دسته‌بندی انتخاب‌شده وجود ندارد.', { categoryId: ['نامعتبر'] });
  }
}

const slugTaken = (tx: Prisma.TransactionClient) => async (slug: string) =>
  // slug is globally UNIQUE (including soft-deleted rows), so no deletedAt filter here.
  !!(await tx.course.findUnique({ where: { slug }, select: { id: true } }));

export async function listAdminCourses(query: AdminCourseListQuery) {
  const where: Prisma.CourseWhereInput = {
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: adminCourseSelect,
    }),
    prisma.course.count({ where }),
  ]);
  return { items, total };
}

export async function getAdminCourse(id: string) {
  const course = await prisma.course.findFirst({
    where: { id: parseId(id), deletedAt: null },
    select: {
      ...adminCourseSelect,
      sections: {
        orderBy: { order: 'asc' },
        select: {
          id: true, title: true, order: true,
          lessons: {
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
            select: {
              id: true, title: true, description: true, videoProvider: true, videoRef: true,
              durationSec: true, order: true, isFreePreview: true, attachmentUrl: true, status: true,
            },
          },
        },
      },
    },
  });
  if (!course) throw errors.notFound('دوره');
  return course;
}

export function createCourse(input: CreateCourseInput, ctx: AdminContext) {
  return retryOnUnique('slug', () =>
    prisma.$transaction(async (tx) => {
      await assertReferences(tx, input);
      const slug = await generateUniqueSlug(input.title, slugTaken(tx));
      const course = await tx.course.create({
        data: { ...input, slug, status: 'DRAFT' },
        select: adminCourseSelect,
      });
      await writeAudit(tx, {
        actorId: ctx.actorId, ip: ctx.ip, action: 'course.create', entity: 'Course',
        entityId: course.id, metadata: { slug, title: course.title },
      });
      return course;
    }, TX_OPTIONS),
  );
}

export async function updateCourse(idRaw: string, patch: UpdateCourseInput, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.course.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, price: true, discountPrice: true },
    });
    if (!existing) throw errors.notFound('دوره');
    await assertReferences(tx, patch);
    assertPricing(
      patch.price ?? existing.price,
      patch.discountPrice === undefined ? existing.discountPrice : patch.discountPrice,
    );
    const course = await tx.course.update({ where: { id }, data: patch, select: adminCourseSelect });
    await writeAudit(tx, {
      actorId: ctx.actorId, ip: ctx.ip, action: 'course.update', entity: 'Course',
      entityId: id, metadata: { fields: Object.keys(patch) },
    });
    return course;
  });
}

/** Soft delete. The slug stays reserved because slug is globally unique. */
export async function deleteCourse(idRaw: string, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.course.findFirst({ where: { id, deletedAt: null }, select: { id: true, slug: true } });
    if (!existing) throw errors.notFound('دوره');
    await tx.course.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit(tx, {
      actorId: ctx.actorId, ip: ctx.ip, action: 'course.delete', entity: 'Course',
      entityId: id, metadata: { slug: existing.slug },
    });
    return { id };
  });
}

/** DRAFT <-> PUBLISHED. ARCHIVED is out of Phase 2 scope, so it cannot be transitioned here. */
export async function setCoursePublished(idRaw: string, publish: boolean, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    const course = await tx.course.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true } });
    if (!course) throw errors.notFound('دوره');
    if (course.status === 'ARCHIVED') {
      throw new AppError(409, 'INVALID_STATE', 'دورهٔ بایگانی‌شده را نمی‌توان منتشر یا غیرفعال کرد.');
    }
    const target = publish ? 'PUBLISHED' : 'DRAFT';
    if (course.status === target) return { id, status: target, changed: false };
    await tx.course.update({ where: { id }, data: { status: target } });
    await writeAudit(tx, {
      actorId: ctx.actorId, ip: ctx.ip, action: publish ? 'course.publish' : 'course.unpublish',
      entity: 'Course', entityId: id, metadata: { from: course.status, to: target },
    });
    return { id, status: target, changed: true };
  });
}

/**
 * Copies course + sections + non-deleted lessons into a new DRAFT course.
 * Reset on the copy: status=DRAFT, featured=false, new unique slug, title "(کپی)".
 * Not copied: enrollments, orders, reviews, progress. The source is never modified.
 */
export function duplicateCourse(idRaw: string, ctx: AdminContext) {
  const sourceId = parseId(idRaw);
  return retryOnUnique('slug', () =>
    prisma.$transaction(async (tx) => {
      const src = await tx.course.findFirst({
        where: { id: sourceId, deletedAt: null },
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: { lessons: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
          },
        },
      });
      if (!src) throw errors.notFound('دوره');
      const title = `${src.title} (کپی)`;
      const slug = await generateUniqueSlug(title, slugTaken(tx));
      const copy = await tx.course.create({
        data: {
          slug, title, status: 'DRAFT', featured: false,
          shortDesc: src.shortDesc, description: src.description,
          thumbnail: src.thumbnail, cover: src.cover,
          price: src.price, discountPrice: src.discountPrice,
          instructorId: src.instructorId, categoryId: src.categoryId,
          level: src.level, durationMin: src.durationMin,
          seoTitle: src.seoTitle, seoDescription: src.seoDescription,
          sections: {
            create: src.sections.map((s) => ({
              title: s.title,
              order: s.order,
              lessons: {
                create: s.lessons.map((l) => ({
                  title: l.title, description: l.description,
                  videoProvider: l.videoProvider, videoRef: l.videoRef,
                  durationSec: l.durationSec, order: l.order, isFreePreview: l.isFreePreview,
                  attachmentUrl: l.attachmentUrl, status: l.status,
                })),
              },
            })),
          },
        },
        select: adminCourseSelect,
      });
      await writeAudit(tx, {
        actorId: ctx.actorId, ip: ctx.ip, action: 'course.duplicate', entity: 'Course',
        entityId: copy.id, metadata: { sourceId, slug },
      });
      return copy;
    }, TX_OPTIONS),
  );
}
