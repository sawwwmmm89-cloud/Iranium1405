import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db/prisma', async () => ({ prisma: (await import('../helpers/prisma-mock')).pm.client }));

import {
  createCourse, deleteCourse, duplicateCourse, setCoursePublished, updateCourse,
} from '@/server/modules/admin-courses/admin-courses.service';
import { pm } from '../helpers/prisma-mock';

const ACTOR = '11111111-1111-4111-8111-111111111111';
const COURSE = '33333333-3333-4333-8333-333333333333';
const INSTR = '44444444-4444-4444-8444-444444444444';
const CAT = '55555555-5555-4555-8555-555555555555';
const ctx = { actorId: ACTOR, ip: '10.0.0.1' };

const audit = () => pm.fn('auditLog.create').mock.calls.at(-1)?.[0]?.data;
const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test', meta: { target: ['slug'] } });

const newCourse = { title: 'دوره تست', shortDesc: 's', description: 'd', instructorId: INSTR, categoryId: CAT, price: 100, level: 'BEGINNER' as const, durationMin: 0, featured: false };

beforeEach(() => {
  pm.reset();
  pm.fn('auditLog.create').mockResolvedValue({});
  pm.fn('course.update').mockResolvedValue({ id: COURSE });
});

describe('createCourse', () => {
  beforeEach(() => {
    pm.fn('instructor.findUnique').mockResolvedValue({ id: INSTR });
    pm.fn('category.findUnique').mockResolvedValue({ id: CAT });
    pm.fn('course.findUnique').mockResolvedValue(null);
    pm.fn('course.create').mockResolvedValue({ id: COURSE, title: 'دوره تست' });
  });
  it('creates a DRAFT with a generated slug and audits course.create', async () => {
    await createCourse(newCourse, ctx);
    const data = pm.fn('course.create').mock.calls[0]?.[0].data;
    expect(data).toMatchObject({ slug: 'دوره-تست', status: 'DRAFT', title: 'دوره تست' });
    expect(audit()).toMatchObject({ action: 'course.create', entity: 'Course', entityId: COURSE, actorId: ACTOR });
  });
  it('422 when instructor or category does not exist, and creates nothing', async () => {
    pm.fn('instructor.findUnique').mockResolvedValue(null);
    await expect(createCourse(newCourse, ctx)).rejects.toMatchObject({ status: 422, code: 'INVALID_REFERENCE' });
    expect(pm.fn('course.create')).not.toHaveBeenCalled();
  });
  it('suffixes the slug when taken (soft-deleted rows included: no deletedAt filter)', async () => {
    pm.fn('course.findUnique').mockResolvedValueOnce({ id: 'x' }).mockResolvedValue(null);
    await createCourse(newCourse, ctx);
    expect(pm.fn('course.create').mock.calls[0]?.[0].data.slug).toBe('دوره-تست-2');
    expect(pm.fn('course.findUnique').mock.calls[0]?.[0].where).toEqual({ slug: 'دوره-تست' });
  });
  it('retries the whole transaction when a concurrent writer wins the slug', async () => {
    pm.fn('course.create').mockRejectedValueOnce(p2002()).mockResolvedValueOnce({ id: COURSE, title: 'دوره تست' });
    await createCourse(newCourse, ctx);
    expect(pm.fn('course.create')).toHaveBeenCalledTimes(2);
    expect(pm.fn('auditLog.create')).toHaveBeenCalledTimes(1);
  });
});

describe('updateCourse', () => {
  it('merges with stored prices: discount above stored price -> 422', async () => {
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE, price: 100, discountPrice: null });
    await expect(updateCourse(COURSE, { discountPrice: 150 }, ctx)).rejects.toMatchObject({ status: 422 });
    expect(pm.fn('course.update')).not.toHaveBeenCalled();
  });
  it('never writes slug, audits changed field names', async () => {
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE, price: 100, discountPrice: null });
    await updateCourse(COURSE, { title: 'عنوان جدید' }, ctx);
    expect(pm.fn('course.update').mock.calls[0]?.[0].data).not.toHaveProperty('slug');
    expect(audit()).toMatchObject({ action: 'course.update', metadata: { fields: ['title'] } });
  });
  it('404 for soft-deleted/missing courses', async () => {
    pm.fn('course.findFirst').mockResolvedValue(null);
    await expect(updateCourse(COURSE, { title: 'عنوان جدید' }, ctx)).rejects.toMatchObject({ status: 404 });
  });
});

describe('deleteCourse (soft delete)', () => {
  it('sets deletedAt instead of deleting rows', async () => {
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE, slug: 'x' });
    await deleteCourse(COURSE, ctx);
    expect(pm.fn('course.update').mock.calls[0]?.[0].data.deletedAt).toBeInstanceOf(Date);
    expect(pm.fn('course.delete')).not.toHaveBeenCalled();
    expect(audit()).toMatchObject({ action: 'course.delete', entityId: COURSE });
  });
  it('404 when already deleted', async () => {
    pm.fn('course.findFirst').mockResolvedValue(null);
    await expect(deleteCourse(COURSE, ctx)).rejects.toMatchObject({ status: 404 });
  });
});

describe('publish / unpublish', () => {
  it('publishes a DRAFT and audits course.publish', async () => {
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE, status: 'DRAFT' });
    await expect(setCoursePublished(COURSE, true, ctx)).resolves.toMatchObject({ status: 'PUBLISHED', changed: true });
    expect(pm.fn('course.update')).toHaveBeenCalledWith({ where: { id: COURSE }, data: { status: 'PUBLISHED' } });
    expect(audit()).toMatchObject({ action: 'course.publish', metadata: { from: 'DRAFT', to: 'PUBLISHED' } });
  });
  it('unpublishes and audits course.unpublish', async () => {
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE, status: 'PUBLISHED' });
    await setCoursePublished(COURSE, false, ctx);
    expect(audit()).toMatchObject({ action: 'course.unpublish' });
  });
  it('is idempotent: same state => no update, no audit', async () => {
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE, status: 'PUBLISHED' });
    await expect(setCoursePublished(COURSE, true, ctx)).resolves.toMatchObject({ changed: false });
    expect(pm.fn('course.update')).not.toHaveBeenCalled();
    expect(pm.fn('auditLog.create')).not.toHaveBeenCalled();
  });
  it('ARCHIVED is out of scope -> 409', async () => {
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE, status: 'ARCHIVED' });
    await expect(setCoursePublished(COURSE, true, ctx)).rejects.toMatchObject({ status: 409, code: 'INVALID_STATE' });
  });
});

describe('duplicateCourse', () => {
  const source = {
    id: COURSE, title: 'دوره', shortDesc: 's', description: 'd', thumbnail: null, cover: null,
    price: 100, discountPrice: 50, instructorId: INSTR, categoryId: CAT, level: 'BEGINNER',
    durationMin: 10, seoTitle: null, seoDescription: null, status: 'PUBLISHED', featured: true,
    sections: [
      { title: 'ف۱', order: 0, lessons: [{ title: 'ج۱', description: null, videoProvider: 'eron', videoRef: 'v1', durationSec: 60, order: 0, isFreePreview: true, attachmentUrl: null, status: 'PUBLISHED' }] },
      { title: 'ف۲', order: 3, lessons: [] },
    ],
  };
  beforeEach(() => {
    pm.fn('course.findFirst').mockResolvedValue(source);
    pm.fn('course.findUnique').mockResolvedValue(null);
    pm.fn('course.create').mockResolvedValue({ id: 'copy-id' });
  });
  it('creates a DRAFT copy with new slug/title, keeps tree and order, never touches the source', async () => {
    await duplicateCourse(COURSE, ctx);
    const data = pm.fn('course.create').mock.calls[0]?.[0].data;
    expect(data).toMatchObject({ title: 'دوره (کپی)', slug: 'دوره-کپی', status: 'DRAFT', featured: false, price: 100, discountPrice: 50 });
    const sections = data.sections.create;
    expect(sections.map((s: { order: number }) => s.order)).toEqual([0, 3]);
    expect(sections[0].lessons.create[0]).toMatchObject({ title: 'ج۱', videoRef: 'v1', order: 0, isFreePreview: true });
    expect(pm.fn('course.update')).not.toHaveBeenCalled();
    expect(pm.fn('enrollment.create')).not.toHaveBeenCalled();
    expect(audit()).toMatchObject({ action: 'course.duplicate', entityId: 'copy-id', metadata: { sourceId: COURSE } });
  });
  it('always gets a fresh slug even if the "(کپی)" slug exists', async () => {
    pm.fn('course.findUnique').mockResolvedValueOnce({ id: 'x' }).mockResolvedValue(null);
    await duplicateCourse(COURSE, ctx);
    expect(pm.fn('course.create').mock.calls[0]?.[0].data.slug).toBe('دوره-کپی-2');
  });
  it('404 for a missing source', async () => {
    pm.fn('course.findFirst').mockResolvedValue(null);
    await expect(duplicateCourse(COURSE, ctx)).rejects.toMatchObject({ status: 404 });
  });
});
