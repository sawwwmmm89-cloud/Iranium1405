import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db/prisma', async () => ({ prisma: (await import('../helpers/prisma-mock')).pm.client }));

import { resetRateLimits } from '@/lib/rate-limit';
import { addComment, getPublishedPost, listPublishedPosts } from '@/server/modules/blog/blog-public.service';
import { moderateComment, setPostPublished } from '@/server/modules/blog/blog-admin.service';
import { enrollLive } from '@/server/modules/live/live.service';
import { createOrder } from '@/server/modules/orders/orders.service';
import type { SessionUser } from '@/server/security/session';
import { pm } from '../helpers/prisma-mock';

const U = '11111111-1111-4111-8111-111111111111';
const COURSE = '22222222-2222-4222-8222-222222222222';
const LIVE = '33333333-3333-4333-8333-333333333333';
const POST = '44444444-4444-4444-8444-444444444444';
const user: SessionUser = { id: U, email: 'a@b.c', name: 'a', role: 'STUDENT' };
const ctx = { actorId: 'admin-1', ip: null };

beforeEach(() => {
  pm.reset();
  resetRateLimits();
  pm.fn('auditLog.create').mockResolvedValue({});
});

describe('blog visibility and comments', () => {
  it('public listing/detail only query PUBLISHED, non-deleted, already-published posts', async () => {
    pm.fn('blogPost.findMany').mockResolvedValue([]);
    pm.fn('blogPost.count').mockResolvedValue(0);
    await listPublishedPosts(1, 12);
    expect(pm.fn('blogPost.findMany').mock.calls[0]?.[0].where).toMatchObject({ status: 'PUBLISHED', deletedAt: null });
    pm.fn('blogPost.findFirst').mockResolvedValue(null);
    await expect(getPublishedPost('draft-post')).rejects.toMatchObject({ status: 404 }); // drafts look non-existent
    expect(pm.fn('blogPost.findFirst').mock.calls[0]?.[0].where).toMatchObject({ slug: 'draft-post', status: 'PUBLISHED', deletedAt: null });
  });
  it('only APPROVED, non-deleted comments are exposed', async () => {
    pm.fn('blogPost.findFirst').mockResolvedValue({ id: POST, slug: 's', title: 't' });
    pm.fn('blogComment.findMany').mockResolvedValue([]);
    await getPublishedPost('s');
    expect(pm.fn('blogComment.findMany').mock.calls[0]?.[0].where).toEqual({ postId: POST, status: 'APPROVED', deletedAt: null });
  });
  it('new comments are PENDING, need a published post, and are rate limited', async () => {
    pm.fn('blogPost.findFirst').mockResolvedValue({ id: POST });
    pm.fn('blogComment.create').mockResolvedValue({ id: 'c1', status: 'PENDING' });
    await addComment(user, 's', '<script>alert(1)</script> نظر');
    expect(pm.fn('blogComment.create').mock.calls[0]?.[0].data).toMatchObject({ postId: POST, userId: U, status: 'PENDING' });
    for (let i = 0; i < 4; i++) await addComment(user, 's', 'نظر');
    await expect(addComment(user, 's', 'نظر')).rejects.toMatchObject({ status: 429 });
    pm.fn('blogPost.findFirst').mockResolvedValue(null);
    resetRateLimits();
    await expect(addComment(user, 'draft', 'نظر')).rejects.toMatchObject({ status: 404 });
  });
  it('admin moderation and publishing are audited; first publish sets publishedAt', async () => {
    pm.fn('blogComment.findFirst').mockResolvedValue({ id: 'c1' });
    pm.fn('blogComment.update').mockResolvedValue({});
    await moderateComment('55555555-5555-4555-8555-555555555555', 'APPROVED', ctx);
    expect(pm.fn('auditLog.create').mock.calls[0]?.[0].data.action).toBe('comment.approve');
    pm.fn('blogPost.findFirst').mockResolvedValue({ id: POST, status: 'DRAFT', publishedAt: null });
    pm.fn('blogPost.update').mockResolvedValue({});
    await setPostPublished(POST, true, ctx);
    expect(pm.fn('blogPost.update').mock.calls[0]?.[0].data).toMatchObject({ status: 'PUBLISHED', publishedAt: expect.any(Date) });
    expect(pm.fn('auditLog.create').mock.calls[1]?.[0].data.action).toBe('blog.publish');
  });
});

describe('createOrder (price integrity, no duplicates)', () => {
  it('amount comes from the database, never from the client', async () => {
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE, price: 5000, discountPrice: 3000 });
    pm.fn('enrollment.findUnique').mockResolvedValue(null);
    pm.fn('order.findFirst').mockResolvedValue(null);
    pm.fn('order.create').mockResolvedValue({ id: 'o1' });
    await createOrder(user, { courseId: COURSE }, null);
    expect(pm.fn('order.create').mock.calls[0]?.[0].data).toMatchObject({ userId: U, totalAmount: 3000, currency: 'IRT', items: { create: [{ courseId: COURSE, unitPrice: 5000, discount: 2000 }] } });
  });
  it('free items 422, already enrolled 409, unpublished 404', async () => {
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE, price: 0, discountPrice: null });
    pm.fn('enrollment.findUnique').mockResolvedValue(null);
    await expect(createOrder(user, { courseId: COURSE }, null)).rejects.toMatchObject({ status: 422, code: 'FREE_ITEM' });
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE, price: 10, discountPrice: null });
    pm.fn('enrollment.findUnique').mockResolvedValue({ id: 'e' });
    await expect(createOrder(user, { courseId: COURSE }, null)).rejects.toMatchObject({ status: 409, code: 'ALREADY_ENROLLED' });
    pm.fn('course.findFirst').mockResolvedValue(null);
    await expect(createOrder(user, { courseId: COURSE }, null)).rejects.toMatchObject({ status: 404 });
    expect(pm.fn('course.findFirst').mock.calls[0]?.[0].where).toMatchObject({ status: 'PUBLISHED', deletedAt: null });
  });
  it('reuses a recent unpaid order instead of creating another', async () => {
    pm.fn('course.findFirst').mockResolvedValue({ id: COURSE, price: 10, discountPrice: null });
    pm.fn('enrollment.findUnique').mockResolvedValue(null);
    pm.fn('order.findFirst').mockResolvedValue({ id: 'existing' });
    await expect(createOrder(user, { courseId: COURSE }, null)).resolves.toEqual({ id: 'existing' });
    expect(pm.fn('order.create')).not.toHaveBeenCalled();
  });
});

describe('enrollLive', () => {
  const open = (over: Record<string, unknown> = {}) => pm.fn('liveClass.findFirst').mockResolvedValue({ id: LIVE, price: 0, capacity: null, ...over });
  beforeEach(() => { pm.fn('$queryRaw').mockResolvedValue([]); pm.fn('liveEnrollment.findUnique').mockResolvedValue(null); pm.fn('liveEnrollment.create').mockResolvedValue({}); });
  it('locks the class row, enrolls and audits', async () => {
    open();
    await expect(enrollLive(user, LIVE)).resolves.toEqual({ enrolled: true, created: true });
    expect(pm.fn('$queryRaw')).toHaveBeenCalled();
    expect(pm.fn('auditLog.create').mock.calls[0]?.[0].data.action).toBe('live.enroll');
  });
  it('paid class => 402; full class => 409; already enrolled => idempotent', async () => {
    open({ price: 100 });
    await expect(enrollLive(user, LIVE)).rejects.toMatchObject({ status: 402 });
    open({ capacity: 2 });
    pm.fn('liveEnrollment.count').mockResolvedValue(2);
    await expect(enrollLive(user, LIVE)).rejects.toMatchObject({ status: 409, code: 'CAPACITY_FULL' });
    pm.fn('liveEnrollment.findUnique').mockResolvedValue({ id: 'x' });
    await expect(enrollLive(user, LIVE)).resolves.toEqual({ enrolled: true, created: false });
  });
});
