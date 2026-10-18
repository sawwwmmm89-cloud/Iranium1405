/**
 * Real-PostgreSQL integration tests for the Phase 2 services.
 * Skipped unless TEST_DATABASE_URL points to a DISPOSABLE database that already has the
 * schema applied (npx prisma migrate deploy). Never point it at production or dev data.
 * Test rows are namespaced per run and removed in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const url = process.env.TEST_DATABASE_URL;
const run = `itest${Date.now()}`;

describe.skipIf(!url)('Phase 2 services against PostgreSQL', () => {
  // Resolved in beforeAll after DATABASE_URL is redirected to the test database.
  let prisma: typeof import('@/server/db/prisma').prisma;
  let courses: typeof import('@/server/modules/admin-courses/admin-courses.service');
  let content: typeof import('@/server/modules/admin-courses/admin-content.service');
  let users: typeof import('@/server/modules/admin-users/admin-users.service');
  let instructorId = '';
  let categoryId = '';
  let adminId = '';
  let targetId = '';
  let ctx: { actorId: string; ip: null };

  const input = (title: string) => ({
    title, shortDesc: 's', description: 'd', price: 100, level: 'BEGINNER' as const,
    durationMin: 0, featured: false, instructorId, categoryId,
  });

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    ({ prisma } = await import('@/server/db/prisma'));
    courses = await import('@/server/modules/admin-courses/admin-courses.service');
    content = await import('@/server/modules/admin-courses/admin-content.service');
    users = await import('@/server/modules/admin-users/admin-users.service');
    instructorId = (await prisma.instructor.create({ data: { slug: run, name: run } })).id;
    categoryId = (await prisma.category.create({ data: { slug: run, name: run } })).id;
    adminId = (await prisma.user.create({ data: { email: `${run}-a@test.local`, name: 'a', passwordHash: 'x', role: 'SUPER_ADMIN' } })).id;
    targetId = (await prisma.user.create({ data: { email: `${run}-t@test.local`, name: 't', passwordHash: 'x' } })).id;
    ctx = { actorId: adminId, ip: null };
  });

  afterAll(async () => {
    if (!url) return;
    await prisma.auditLog.deleteMany({ where: { actorId: adminId } });
    await prisma.session.deleteMany({ where: { userId: { in: [adminId, targetId] } } });
    await prisma.course.deleteMany({ where: { instructorId } }); // sections/lessons cascade
    await prisma.instructor.delete({ where: { id: instructorId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, targetId] } } });
    await prisma.$disconnect();
  });

  it('slugs stay unique, including against soft-deleted courses', async () => {
    const a = await courses.createCourse(input(`${run} slug`), ctx);
    await courses.deleteCourse(a.id, ctx);
    const b = await courses.createCourse(input(`${run} slug`), ctx);
    expect(b.slug).toBe(`${a.slug}-2`);
  });

  it('concurrent creates with the same title all succeed with distinct slugs', async () => {
    const created = await Promise.all(Array.from({ length: 4 }, () => courses.createCourse(input(`${run} race`), ctx)));
    expect(new Set(created.map((c) => c.slug)).size).toBe(4);
  });

  it('reorders sections and lessons without unique-constraint collisions', async () => {
    const c = await courses.createCourse(input(`${run} order`), ctx);
    const s1 = await content.createSection(c.id, { title: 'a' }, ctx);
    const s2 = await content.createSection(c.id, { title: 'b' }, ctx);
    const s3 = await content.createSection(c.id, { title: 'c' }, ctx);
    await content.reorderSections(c.id, [s3.id, s1.id, s2.id], ctx);
    const rows = await prisma.courseSection.findMany({ where: { courseId: c.id }, orderBy: { order: 'asc' } });
    expect(rows.map((r) => [r.id, r.order])).toEqual([[s3.id, 0], [s1.id, 1], [s2.id, 2]]);

    const l1 = await content.createLesson(s1.id, { title: '1', durationSec: 0, isFreePreview: false, status: 'DRAFT' }, ctx);
    const l2 = await content.createLesson(s1.id, { title: '2', durationSec: 0, isFreePreview: false, status: 'DRAFT' }, ctx);
    const l3 = await content.createLesson(s1.id, { title: '3', durationSec: 0, isFreePreview: false, status: 'DRAFT' }, ctx);
    await content.deleteLesson(l2.id, ctx);
    await content.reorderLessons(s1.id, [l3.id, l1.id], ctx);
    const lessons = await prisma.lesson.findMany({ where: { sectionId: s1.id }, orderBy: { order: 'asc' } });
    expect(lessons.map((l) => l.id)).toEqual([l3.id, l1.id, l2.id]); // soft-deleted row trails
    expect(lessons[2]?.deletedAt).not.toBeNull();
  });

  it('section delete: 409 while any lesson row exists (even soft-deleted), allowed when empty', async () => {
    const c = await courses.createCourse(input(`${run} secdel`), ctx);
    const s = await content.createSection(c.id, { title: 's' }, ctx);
    const l = await content.createLesson(s.id, { title: 'l', durationSec: 0, isFreePreview: false, status: 'DRAFT' }, ctx);
    await expect(content.deleteSection(s.id, ctx)).rejects.toMatchObject({ status: 409 });
    await content.deleteLesson(l.id, ctx);
    await expect(content.deleteSection(s.id, ctx)).rejects.toMatchObject({ status: 409 });
    expect(await prisma.lesson.count({ where: { id: l.id } })).toBe(1); // not cascaded away
    const empty = await content.createSection(c.id, { title: 'empty' }, ctx);
    await expect(content.deleteSection(empty.id, ctx)).resolves.toEqual({ id: empty.id });
  });

  it('duplicate copies the tree as an independent DRAFT and leaves the source untouched', async () => {
    const c = await courses.createCourse(input(`${run} dup`), ctx);
    await courses.setCoursePublished(c.id, true, ctx);
    const s = await content.createSection(c.id, { title: 's' }, ctx);
    await content.createLesson(s.id, { title: 'l', videoProvider: 'eron', videoRef: 'v', durationSec: 5, isFreePreview: true, status: 'PUBLISHED' }, ctx);
    const copy = await courses.duplicateCourse(c.id, ctx);
    expect(copy).toMatchObject({ status: 'DRAFT', featured: false, title: `${c.title} (کپی)` });
    expect(copy.slug).not.toBe(c.slug);
    const tree = await prisma.course.findUniqueOrThrow({ where: { id: copy.id }, include: { sections: { include: { lessons: true } } } });
    expect(tree.sections).toHaveLength(1);
    expect(tree.sections[0]?.lessons[0]).toMatchObject({ title: 'l', videoRef: 'v', isFreePreview: true });
    expect(tree.sections[0]?.id).not.toBe(s.id);
    const source = await prisma.course.findUniqueOrThrow({ where: { id: c.id } });
    expect(source.status).toBe('PUBLISHED');
  });

  it('suspend revokes active sessions; every mutation leaves an AuditLog row', async () => {
    await prisma.session.createMany({
      data: [1, 2].map((i) => ({ userId: targetId, tokenHash: `${run}-${i}`, expiresAt: new Date(Date.now() + 3_600_000) })),
    });
    await users.setUserStatus(targetId, 'SUSPENDED', { id: adminId, role: 'SUPER_ADMIN' });
    expect(await prisma.session.count({ where: { userId: targetId, revokedAt: null } })).toBe(0);
    await users.setUserStatus(targetId, 'ACTIVE', { id: adminId, role: 'SUPER_ADMIN' });
    await users.changeUserRole(targetId, 'ADMIN', { id: adminId, role: 'SUPER_ADMIN' });
    const actions = (await prisma.auditLog.findMany({ where: { actorId: adminId }, select: { action: true } })).map((a) => a.action);
    for (const a of ['course.create', 'course.delete', 'course.publish', 'course.duplicate', 'course.reorder', 'section.create', 'section.delete', 'lesson.create', 'lesson.delete', 'lesson.reorder', 'user.suspend', 'user.activate', 'user.role_change']) {
      expect(actions).toContain(a);
    }
  });

  it('cannot demote or suspend the last active SUPER_ADMIN', async () => {
    // Needs a second SUPER_ADMIN acting on `adminId`; other SUPER_ADMINs in the DB are excluded by design.
    const others = await prisma.user.count({ where: { role: 'SUPER_ADMIN', status: 'ACTIVE', deletedAt: null, id: { not: adminId } } });
    if (others > 0) return; // test DB is not isolated enough to exercise the guard
    const second = await prisma.user.create({ data: { email: `${run}-s@test.local`, name: 's', passwordHash: 'x', role: 'SUPER_ADMIN' } });
    try {
      await users.changeUserRole(second.id, 'ADMIN', { id: adminId, role: 'SUPER_ADMIN' }); // 2 active -> allowed
      await prisma.user.update({ where: { id: second.id }, data: { role: 'SUPER_ADMIN' } });
      await prisma.user.update({ where: { id: adminId }, data: { status: 'SUSPENDED' } }); // only `second` is active
      await expect(users.changeUserRole(second.id, 'ADMIN', { id: targetId, role: 'SUPER_ADMIN' })).rejects.toMatchObject({ code: 'LAST_SUPER_ADMIN' });
    } finally {
      await prisma.user.update({ where: { id: adminId }, data: { status: 'ACTIVE' } });
      await prisma.auditLog.deleteMany({ where: { entityId: second.id } });
      await prisma.user.delete({ where: { id: second.id } });
    }
  });
});
