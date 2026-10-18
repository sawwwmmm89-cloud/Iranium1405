/** In-process handler tests: real route modules + adminRoute/CSRF/validation, mocked services and session. */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createCourse: vi.fn(),
  setCoursePublished: vi.fn(),
  deleteSection: vi.fn(),
  listAdminUsers: vi.fn(),
  changeUserRole: vi.fn(),
  setUserStatus: vi.fn(),
}));

vi.mock('@/server/security/session', () => ({ requireUser: h.requireUser, ADMIN_ROLES: ['SUPER_ADMIN', 'ADMIN'] }));
vi.mock('@/server/modules/admin-courses/admin-courses.service', () => ({
  createCourse: h.createCourse, setCoursePublished: h.setCoursePublished,
  listAdminCourses: vi.fn(), getAdminCourse: vi.fn(), updateCourse: vi.fn(), deleteCourse: vi.fn(), duplicateCourse: vi.fn(),
}));
vi.mock('@/server/modules/admin-courses/admin-content.service', () => ({ deleteSection: h.deleteSection }));
vi.mock('@/server/modules/admin-users/admin-users.service', () => ({
  listAdminUsers: h.listAdminUsers, changeUserRole: h.changeUserRole, setUserStatus: h.setUserStatus,
}));

import { AppError } from '@/server/errors/app-error';
import { createCsrfToken, CSRF_COOKIE, CSRF_HEADER } from '@/server/security/csrf-constants';
import { POST as createCoursePost } from '@/app/api/v1/admin/courses/route';
import { POST as publishPost } from '@/app/api/v1/admin/courses/[id]/publish/route';
import { DELETE as deleteSectionDelete } from '@/app/api/v1/admin/sections/[id]/route';
import { GET as usersGet } from '@/app/api/v1/admin/users/route';
import { PATCH as rolePatch } from '@/app/api/v1/admin/users/[id]/role/route';
import { POST as suspendPost } from '@/app/api/v1/admin/users/[id]/suspend/route';

const ID = '33333333-3333-4333-8333-333333333333';
const csrf = createCsrfToken();
const secured = { cookie: `${CSRF_COOKIE}=${csrf}`, [CSRF_HEADER]: csrf };
const req = (method: string, body?: unknown, headers: Record<string, string> = secured, url = 'http://localhost:3000/api/v1/admin/x') =>
  new NextRequest(url, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: ID }) };
const json = async (r: Response) => (await r.json()) as { success: boolean; data?: unknown; error?: { code: string; details?: Record<string, string[]> } };

const validCourse = { title: 'دوره', shortDesc: 's', description: 'd', instructorId: ID, categoryId: ID };

beforeEach(() => {
  Object.values(h).forEach((f) => f.mockReset());
  h.requireUser.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
});

describe('POST /admin/courses', () => {
  it('201 + envelope; service receives parsed input and the actor', async () => {
    h.createCourse.mockResolvedValue({ id: ID });
    const res = await createCoursePost(req('POST', validCourse), undefined);
    expect(res.status).toBe(201);
    expect(await json(res)).toEqual({ success: true, data: { id: ID } });
    expect(h.createCourse).toHaveBeenCalledWith(expect.objectContaining({ title: 'دوره', price: 0, level: 'BEGINNER' }), expect.objectContaining({ actorId: 'admin-1' }));
  });
  it('400 BAD_JSON for malformed bodies', async () => {
    const res = await createCoursePost(req('POST', '{nope'), undefined);
    expect(res.status).toBe(400);
    expect((await json(res)).error?.code).toBe('BAD_JSON');
  });
  it('422 with field details for invalid input; service not called', async () => {
    const res = await createCoursePost(req('POST', { ...validCourse, price: 10, discountPrice: 20 }), undefined);
    expect(res.status).toBe(422);
    expect((await json(res)).error?.details).toHaveProperty('discountPrice');
    expect(h.createCourse).not.toHaveBeenCalled();
  });
  it('403 without CSRF; 401 when unauthenticated', async () => {
    expect((await createCoursePost(req('POST', validCourse, {}), undefined)).status).toBe(403);
    h.requireUser.mockRejectedValue(new AppError(401, 'UNAUTHORIZED', 'x'));
    expect((await createCoursePost(req('POST', validCourse), undefined)).status).toBe(401);
  });
});

describe('course / section routes', () => {
  it('publish route passes (id, true, ctx)', async () => {
    h.setCoursePublished.mockResolvedValue({ id: ID, status: 'PUBLISHED', changed: true });
    const res = await publishPost(req('POST'), ctx);
    expect(res.status).toBe(200);
    expect(h.setCoursePublished).toHaveBeenCalledWith(ID, true, expect.objectContaining({ actorId: 'admin-1' }));
  });
  it('propagates service errors as the envelope (409 SECTION_NOT_EMPTY)', async () => {
    h.deleteSection.mockRejectedValue(new AppError(409, 'SECTION_NOT_EMPTY', 'x'));
    const res = await deleteSectionDelete(req('DELETE'), ctx);
    expect(res.status).toBe(409);
    expect((await json(res)).error?.code).toBe('SECTION_NOT_EMPTY');
  });
  it('unexpected errors -> 500 with request id, no internals leaked', async () => {
    h.deleteSection.mockRejectedValue(new Error('connection string postgres://secret'));
    const res = await deleteSectionDelete(req('DELETE'), ctx);
    const text = JSON.stringify(await json(res));
    expect(res.status).toBe(500);
    expect(text).toContain('INTERNAL_ERROR');
    expect(text).not.toContain('postgres://');
  });
});

describe('user routes', () => {
  it('GET list allows the default admin roles and validates the query', async () => {
    h.listAdminUsers.mockResolvedValue({ items: [], total: 0 });
    const ok = await usersGet(req('GET', undefined, {}, 'http://localhost:3000/api/v1/admin/users?page=2&role=ADMIN'), undefined);
    expect(ok.status).toBe(200);
    expect(h.requireUser).toHaveBeenCalledWith(['SUPER_ADMIN', 'ADMIN']);
    expect(h.listAdminUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 2, role: 'ADMIN' }));
    const bad = await usersGet(req('GET', undefined, {}, 'http://localhost:3000/api/v1/admin/users?role=HACKER'), undefined);
    expect(bad.status).toBe(422);
  });
  it('role change and suspend require SUPER_ADMIN at the route boundary', async () => {
    h.requireUser.mockRejectedValue(new AppError(403, 'FORBIDDEN', 'x'));
    expect((await rolePatch(req('PATCH', { role: 'ADMIN' }), ctx)).status).toBe(403);
    expect((await suspendPost(req('POST'), ctx)).status).toBe(403);
    expect(h.requireUser).toHaveBeenNthCalledWith(1, ['SUPER_ADMIN']);
    expect(h.changeUserRole).not.toHaveBeenCalled();
  });
  it('role change validates the role value and passes actor info', async () => {
    h.requireUser.mockResolvedValue({ id: 'sa-1', role: 'SUPER_ADMIN' });
    expect((await rolePatch(req('PATCH', { role: 'GOD' }), ctx)).status).toBe(422);
    h.changeUserRole.mockResolvedValue({ id: ID, role: 'ADMIN', changed: true });
    const res = await rolePatch(req('PATCH', { role: 'ADMIN' }), ctx);
    expect(res.status).toBe(200);
    expect(h.changeUserRole).toHaveBeenCalledWith(ID, 'ADMIN', expect.objectContaining({ id: 'sa-1', role: 'SUPER_ADMIN' }));
  });
  it('suspend passes SUSPENDED', async () => {
    h.requireUser.mockResolvedValue({ id: 'sa-1', role: 'SUPER_ADMIN' });
    h.setUserStatus.mockResolvedValue({ id: ID, status: 'SUSPENDED', changed: true });
    await suspendPost(req('POST'), ctx);
    expect(h.setUserStatus).toHaveBeenCalledWith(ID, 'SUSPENDED', expect.objectContaining({ id: 'sa-1' }));
  });
});
