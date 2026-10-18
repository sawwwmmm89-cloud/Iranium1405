import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db/prisma', async () => ({ prisma: (await import('../helpers/prisma-mock')).pm.client }));

import {
  createLesson, createSection, deleteLesson, deleteSection, reorderLessons, reorderSections,
} from '@/server/modules/admin-courses/admin-content.service';
import { pm } from '../helpers/prisma-mock';

const ACTOR = '11111111-1111-4111-8111-111111111111';
const COURSE = '33333333-3333-4333-8333-333333333333';
const SEC = '66666666-6666-4666-8666-666666666666';
const L1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const L2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const L3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ctx = { actorId: ACTOR, ip: null };

const audit = () => pm.fn('auditLog.create').mock.calls.at(-1)?.[0]?.data;
const orderCalls = (model: string) =>
  pm.fn(`${model}.update`).mock.calls.map((c) => [c[0].where.id as string, c[0].data.order as number]);

beforeEach(() => {
  pm.reset();
  pm.fn('auditLog.create').mockResolvedValue({});
});

describe('sections', () => {
  it('appends after the current max order and audits section.create', async () => {
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE });
    pm.fn('courseSection.aggregate').mockResolvedValue({ _max: { order: 2 } });
    pm.fn('courseSection.create').mockResolvedValue({ id: SEC, title: 'ف' });
    await createSection(COURSE, { title: 'ف' }, ctx);
    expect(pm.fn('courseSection.create').mock.calls[0]?.[0].data).toEqual({ courseId: COURSE, title: 'ف', order: 3 });
    expect(audit()).toMatchObject({ action: 'section.create', entityId: SEC });
  });
  it('first section gets order 0', async () => {
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE });
    pm.fn('courseSection.aggregate').mockResolvedValue({ _max: { order: null } });
    pm.fn('courseSection.create').mockResolvedValue({ id: SEC, title: 'ف' });
    await createSection(COURSE, { title: 'ف' }, ctx);
    expect(pm.fn('courseSection.create').mock.calls[0]?.[0].data.order).toBe(0);
  });

  it('delete: removes an empty section via a conditional DELETE and audits', async () => {
    pm.fn('courseSection.deleteMany').mockResolvedValue({ count: 1 });
    await deleteSection(SEC, ctx);
    expect(pm.fn('courseSection.deleteMany').mock.calls[0]?.[0].where).toEqual({ id: SEC, lessons: { none: {} } });
    expect(audit()).toMatchObject({ action: 'section.delete', entityId: SEC });
  });
  it('delete: 409 SECTION_NOT_EMPTY when lessons exist (no cascade, no audit)', async () => {
    pm.fn('courseSection.deleteMany').mockResolvedValue({ count: 0 });
    pm.fn('courseSection.findUnique').mockResolvedValue({ id: SEC });
    await expect(deleteSection(SEC, ctx)).rejects.toMatchObject({ status: 409, code: 'SECTION_NOT_EMPTY' });
    expect(pm.fn('auditLog.create')).not.toHaveBeenCalled();
  });
  it('delete: 404 when the section does not exist', async () => {
    pm.fn('courseSection.deleteMany').mockResolvedValue({ count: 0 });
    pm.fn('courseSection.findUnique').mockResolvedValue(null);
    await expect(deleteSection(SEC, ctx)).rejects.toMatchObject({ status: 404 });
  });

  it('reorder: parks rows on unique negatives, then writes 0..n-1, audits course.reorder', async () => {
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE });
    pm.fn('courseSection.findMany').mockResolvedValue([{ id: L1 }, { id: L2 }]);
    pm.fn('courseSection.update').mockResolvedValue({});
    await reorderSections(COURSE, [L2, L1], ctx);
    expect(orderCalls('courseSection')).toEqual([[L2, -1], [L1, -2], [L2, 0], [L1, 1]]);
    expect(audit()).toMatchObject({ action: 'course.reorder', entityId: COURSE, metadata: { scope: 'sections', ids: [L2, L1] } });
  });
  it('reorder: 422 when the id list is incomplete or foreign', async () => {
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE });
    pm.fn('courseSection.findMany').mockResolvedValue([{ id: L1 }, { id: L2 }]);
    await expect(reorderSections(COURSE, [L1], ctx)).rejects.toMatchObject({ status: 422, code: 'REORDER_MISMATCH' });
    await expect(reorderSections(COURSE, [L1, L3], ctx)).rejects.toMatchObject({ code: 'REORDER_MISMATCH' });
    expect(pm.fn('courseSection.update')).not.toHaveBeenCalled();
  });
});

describe('lessons', () => {
  it('createLesson appends after max order of ALL rows (incl. soft-deleted)', async () => {
    pm.fn('courseSection.findFirst').mockResolvedValue({ id: SEC });
    pm.fn('lesson.aggregate').mockResolvedValue({ _max: { order: 4 } });
    pm.fn('lesson.create').mockResolvedValue({ id: L1, title: 'ج' });
    await createLesson(SEC, { title: 'ج', durationSec: 0, isFreePreview: false, status: 'DRAFT' }, ctx);
    expect(pm.fn('lesson.aggregate').mock.calls[0]?.[0].where).toEqual({ sectionId: SEC }); // no deletedAt filter
    expect(pm.fn('lesson.create').mock.calls[0]?.[0].data).toMatchObject({ sectionId: SEC, order: 5, status: 'DRAFT' });
    expect(audit()).toMatchObject({ action: 'lesson.create', entity: 'Lesson', entityId: L1 });
  });
  it('deleteLesson is a soft delete + audit lesson.delete', async () => {
    pm.fn('lesson.findFirst').mockResolvedValue({ id: L1, sectionId: SEC });
    pm.fn('lesson.update').mockResolvedValue({});
    await deleteLesson(L1, ctx);
    expect(pm.fn('lesson.update').mock.calls[0]?.[0].data.deletedAt).toBeInstanceOf(Date);
    expect(pm.fn('lesson.delete')).not.toHaveBeenCalled();
    expect(audit()).toMatchObject({ action: 'lesson.delete', entityId: L1 });
  });
  it('reorderLessons keeps soft-deleted rows after the live ones so (sectionId, order) never collides', async () => {
    pm.fn('courseSection.findFirst').mockResolvedValue({ id: SEC });
    pm.fn('lesson.findMany').mockResolvedValue([
      { id: L1, deletedAt: null },
      { id: L3, deletedAt: new Date() },
      { id: L2, deletedAt: null },
    ]);
    pm.fn('lesson.update').mockResolvedValue({});
    await reorderLessons(SEC, [L2, L1], ctx);
    const calls = orderCalls('lesson');
    expect(calls.slice(0, 3)).toEqual([[L2, -1], [L1, -2], [L3, -3]]);
    expect(calls.slice(3)).toEqual([[L2, 0], [L1, 1], [L3, 2]]);
    expect(audit()).toMatchObject({ action: 'lesson.reorder', entityId: SEC });
  });
  it('reorderLessons 422 if a soft-deleted lesson id is supplied', async () => {
    pm.fn('courseSection.findFirst').mockResolvedValue({ id: SEC });
    pm.fn('lesson.findMany').mockResolvedValue([{ id: L1, deletedAt: null }, { id: L3, deletedAt: new Date() }]);
    await expect(reorderLessons(SEC, [L1, L3], ctx)).rejects.toMatchObject({ code: 'REORDER_MISMATCH' });
  });
});
