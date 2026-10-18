import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db/prisma', async () => ({ prisma: (await import('../helpers/prisma-mock')).pm.client }));
const h = vi.hoisted(() => ({
  resolveLessonAccess: vi.fn(),
  canManageCourse: vi.fn(),
  storage: { put: vi.fn(), delete: vi.fn(), signedDownloadUrl: vi.fn() },
  requireStorage: vi.fn(),
}));
vi.mock('@/server/modules/access/access.service', () => ({ resolveLessonAccess: h.resolveLessonAccess, canManageCourse: h.canManageCourse }));
vi.mock('@/server/storage/storage', () => ({ requireStorage: h.requireStorage }));

import { AppError } from '@/server/errors/app-error';
import { createDownloadUrl, deleteAttachment, uploadAttachment } from '@/server/modules/attachments/attachments.service';
import type { SessionUser } from '@/server/security/session';
import { pm } from '../helpers/prisma-mock';

const LESSON = '11111111-1111-4111-8111-111111111111';
const COURSE = '22222222-2222-4222-8222-222222222222';
const ATT = '33333333-3333-4333-8333-333333333333';
const user: SessionUser = { id: 'u1', email: 'a@b.c', name: 'a', role: 'INSTRUCTOR' };
const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x0a, 0x25]);
const file = { name: 'جزوه جلسه اول.pdf', declaredMime: 'application/pdf', bytes: pdf };

beforeEach(() => {
  pm.reset();
  Object.values(h.storage).forEach((f) => f.mockReset());
  h.storage.put.mockResolvedValue(undefined);
  h.storage.delete.mockResolvedValue(undefined);
  h.requireStorage.mockReset().mockReturnValue(h.storage);
  h.resolveLessonAccess.mockReset().mockResolvedValue({ lessonId: LESSON, courseId: COURSE, canManage: true, canView: true });
  h.canManageCourse.mockReset().mockResolvedValue(true);
  pm.fn('lessonAttachment.count').mockResolvedValue(0);
  pm.fn('lessonAttachment.create').mockResolvedValue({ id: ATT, originalName: file.name });
  pm.fn('lessonAttachment.update').mockResolvedValue({});
  pm.fn('auditLog.create').mockResolvedValue({});
});

describe('uploadAttachment', () => {
  it('403 for users who cannot manage the course; storage untouched', async () => {
    h.resolveLessonAccess.mockResolvedValue({ lessonId: LESSON, courseId: COURSE, canManage: false, canView: true });
    await expect(uploadAttachment(user, LESSON, file, null)).rejects.toMatchObject({ status: 403 });
    expect(h.storage.put).not.toHaveBeenCalled();
  });
  it('503 STORAGE_NOT_CONFIGURED when storage is not configured', async () => {
    h.requireStorage.mockImplementation(() => { throw new AppError(503, 'STORAGE_NOT_CONFIGURED', 'x'); });
    await expect(uploadAttachment(user, LESSON, file, null)).rejects.toMatchObject({ status: 503, code: 'STORAGE_NOT_CONFIGURED' });
  });
  it('rejects forged content before anything is stored', async () => {
    const bad = { ...file, bytes: new TextEncoder().encode('<html><script>1</script></html>') };
    await expect(uploadAttachment(user, LESSON, bad, null)).rejects.toMatchObject({ status: 415 });
    expect(h.storage.put).not.toHaveBeenCalled();
  });
  it('409 beyond the per-lesson limit', async () => {
    pm.fn('lessonAttachment.count').mockResolvedValue(20);
    await expect(uploadAttachment(user, LESSON, file, null)).rejects.toMatchObject({ status: 409, code: 'TOO_MANY_ATTACHMENTS' });
    expect(h.storage.put).not.toHaveBeenCalled();
  });
  it('stores under a random key (no user-controlled name), records sha256 and audits', async () => {
    await uploadAttachment(user, LESSON, file, '1.2.3.4');
    const [key, , mime] = h.storage.put.mock.calls[0] as [string, Buffer, string];
    expect(key).toMatch(new RegExp(`^lessons/${LESSON}/[0-9a-f-]{36}\\.pdf$`));
    expect(key).not.toContain('جزوه');
    expect(mime).toBe('application/pdf');
    const data = pm.fn('lessonAttachment.create').mock.calls[0]?.[0].data;
    expect(data).toMatchObject({ lessonId: LESSON, storageKey: key, mimeType: 'application/pdf', uploadedById: 'u1' });
    expect(data.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(pm.fn('auditLog.create').mock.calls[0]?.[0].data).toMatchObject({ action: 'attachment.upload', entityId: ATT });
  });
  it('removes the stored object when the DB write fails (no orphan)', async () => {
    pm.fn('lessonAttachment.create').mockRejectedValue(new Error('db down'));
    await expect(uploadAttachment(user, LESSON, file, null)).rejects.toThrow('db down');
    const key = (h.storage.put.mock.calls[0] as [string])[0];
    expect(h.storage.delete).toHaveBeenCalledWith(key);
  });
});

describe('createDownloadUrl', () => {
  it('403 without view access: no signed URL is ever created', async () => {
    h.resolveLessonAccess.mockResolvedValue({ lessonId: LESSON, courseId: COURSE, canManage: false, canView: false });
    await expect(createDownloadUrl(user, LESSON, ATT)).rejects.toMatchObject({ status: 403 });
    expect(h.storage.signedDownloadUrl).not.toHaveBeenCalled();
  });
  it('404 when the attachment belongs to another lesson or is deleted (lookup is scoped)', async () => {
    pm.fn('lessonAttachment.findFirst').mockResolvedValue(null);
    await expect(createDownloadUrl(user, LESSON, ATT)).rejects.toMatchObject({ status: 404 });
    expect(pm.fn('lessonAttachment.findFirst').mock.calls[0]?.[0].where).toEqual({ id: ATT, lessonId: LESSON, deletedAt: null });
  });
  it('returns only the short-lived signed URL (never the storage key)', async () => {
    pm.fn('lessonAttachment.findFirst').mockResolvedValue({ storageKey: 'lessons/x/y.pdf', originalName: 'a.pdf', mimeType: 'application/pdf' });
    h.storage.signedDownloadUrl.mockResolvedValue('https://signed.example/url?sig=1');
    await expect(createDownloadUrl(user, LESSON, ATT)).resolves.toBe('https://signed.example/url?sig=1');
    expect(h.storage.signedDownloadUrl).toHaveBeenCalledWith('lessons/x/y.pdf', { fileName: 'a.pdf', contentType: 'application/pdf' });
  });
});

describe('deleteAttachment', () => {
  const row = { id: ATT, storageKey: 'lessons/x/y.pdf', lesson: { section: { courseId: COURSE } } };
  it('403 when the user cannot manage the course', async () => {
    pm.fn('lessonAttachment.findFirst').mockResolvedValue(row);
    h.canManageCourse.mockResolvedValue(false);
    await expect(deleteAttachment(user, ATT, null)).rejects.toMatchObject({ status: 403 });
    expect(pm.fn('lessonAttachment.update')).not.toHaveBeenCalled();
  });
  it('soft-deletes, audits, deletes the object and marks purgedAt', async () => {
    pm.fn('lessonAttachment.findFirst').mockResolvedValue(row);
    await deleteAttachment(user, ATT, null);
    expect(pm.fn('lessonAttachment.update').mock.calls[0]?.[0].data.deletedAt).toBeInstanceOf(Date);
    expect(h.storage.delete).toHaveBeenCalledWith('lessons/x/y.pdf');
    expect(pm.fn('lessonAttachment.update').mock.calls[1]?.[0].data.purgedAt).toBeInstanceOf(Date);
    expect(pm.fn('auditLog.create').mock.calls[0]?.[0].data.action).toBe('attachment.delete');
  });
  it('storage failure keeps the row retryable (no purgedAt)', async () => {
    pm.fn('lessonAttachment.findFirst').mockResolvedValue(row);
    h.storage.delete.mockRejectedValue(new Error('s3 down'));
    await expect(deleteAttachment(user, ATT, null)).resolves.toEqual({ id: ATT });
    expect(pm.fn('lessonAttachment.update')).toHaveBeenCalledTimes(1); // only the soft delete
  });
});
