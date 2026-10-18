import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db/prisma', async () => ({ prisma: (await import('../helpers/prisma-mock')).pm.client }));

import { canManageCourse, resolveLessonAccess } from '@/server/modules/access/access.service';
import type { SessionUser } from '@/server/security/session';
import { pm } from '../helpers/prisma-mock';

const LESSON = '11111111-1111-4111-8111-111111111111';
const COURSE = '22222222-2222-4222-8222-222222222222';
const user = (role: SessionUser['role']): SessionUser => ({ id: 'u1', email: 'a@b.c', name: 'a', role });
const lesson = (over: Record<string, unknown> = {}, courseStatus = 'PUBLISHED') => ({
  id: LESSON, status: 'PUBLISHED', isFreePreview: false, section: { courseId: COURSE, course: { status: courseStatus } }, ...over,
});

beforeEach(() => pm.reset());

describe('canManageCourse', () => {
  it('admins yes; students never; instructors only for their own courses', async () => {
    expect(await canManageCourse(user('ADMIN'), COURSE)).toBe(true);
    expect(await canManageCourse(user('SUPER_ADMIN'), COURSE)).toBe(true);
    expect(await canManageCourse(user('STUDENT'), COURSE)).toBe(false);
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE });
    expect(await canManageCourse(user('INSTRUCTOR'), COURSE)).toBe(true);
    expect(pm.fn('course.findFirst').mock.calls[0]?.[0].where).toMatchObject({ id: COURSE, instructor: { userId: 'u1' } });
    pm.fn('course.findFirst').mockResolvedValue(null);
    expect(await canManageCourse(user('INSTRUCTOR'), COURSE)).toBe(false);
  });
});

describe('resolveLessonAccess', () => {
  it('404 when the lesson (or its course) is deleted/missing', async () => {
    pm.fn('lesson.findFirst').mockResolvedValue(null);
    await expect(resolveLessonAccess(user('STUDENT'), LESSON)).rejects.toMatchObject({ status: 404 });
  });
  it('enrolled student can view a published lesson but cannot manage', async () => {
    pm.fn('lesson.findFirst').mockResolvedValue(lesson());
    pm.fn('enrollment.findUnique').mockResolvedValue({ id: 'e1' });
    expect(await resolveLessonAccess(user('STUDENT'), LESSON)).toMatchObject({ canView: true, canManage: false, courseId: COURSE });
  });
  it('NOT enrolled => no access to a paid lesson (changing ids/urls does not help)', async () => {
    pm.fn('lesson.findFirst').mockResolvedValue(lesson());
    pm.fn('enrollment.findUnique').mockResolvedValue(null);
    expect(await resolveLessonAccess(user('STUDENT'), LESSON)).toMatchObject({ canView: false });
  });
  it('free preview is viewable without enrollment, but only when lesson and course are published', async () => {
    pm.fn('lesson.findFirst').mockResolvedValue(lesson({ isFreePreview: true }));
    expect((await resolveLessonAccess(user('STUDENT'), LESSON)).canView).toBe(true);
    pm.fn('lesson.findFirst').mockResolvedValue(lesson({ isFreePreview: true, status: 'DRAFT' }));
    expect((await resolveLessonAccess(user('STUDENT'), LESSON)).canView).toBe(false);
    pm.fn('lesson.findFirst').mockResolvedValue(lesson({ isFreePreview: true }, 'DRAFT'));
    expect((await resolveLessonAccess(user('STUDENT'), LESSON)).canView).toBe(false);
  });
  it('enrolled students cannot see DISABLED/DRAFT lessons or unpublished courses', async () => {
    pm.fn('enrollment.findUnique').mockResolvedValue({ id: 'e1' });
    pm.fn('lesson.findFirst').mockResolvedValue(lesson({ status: 'DISABLED' }));
    expect((await resolveLessonAccess(user('STUDENT'), LESSON)).canView).toBe(false);
    pm.fn('lesson.findFirst').mockResolvedValue(lesson({}, 'DRAFT'));
    expect((await resolveLessonAccess(user('STUDENT'), LESSON)).canView).toBe(false);
  });
  it('admins can view and manage anything, including drafts', async () => {
    pm.fn('lesson.findFirst').mockResolvedValue(lesson({ status: 'DRAFT' }, 'DRAFT'));
    expect(await resolveLessonAccess(user('ADMIN'), LESSON)).toMatchObject({ canView: true, canManage: true });
  });
});
