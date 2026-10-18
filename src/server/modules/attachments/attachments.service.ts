import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { getMaxUploadBytes } from '@/lib/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/server/db/prisma';
import { AppError, errors } from '@/server/errors/app-error';
import { parseId } from '@/server/modules/admin-courses/course.schema';
import { canManageCourse, resolveLessonAccess } from '@/server/modules/access/access.service';
import { writeAudit } from '@/server/security/audit';
import type { SessionUser } from '@/server/security/session';
import { validateUpload } from '@/server/storage/file-policy';
import { requireStorage } from '@/server/storage/storage';

export const MAX_ATTACHMENTS_PER_LESSON = 20;
const publicSelect = { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true } as const;

export interface UploadInput {
  name: string;
  declaredMime: string | undefined;
  bytes: Uint8Array;
}

export async function uploadAttachment(user: SessionUser, lessonIdRaw: string, file: UploadInput, ip: string | null) {
  const lessonId = parseId(lessonIdRaw);
  const access = await resolveLessonAccess(user, lessonId);
  if (!access.canManage) throw errors.forbidden();
  const storage = requireStorage();
  const checked = validateUpload({ ...file, maxBytes: getMaxUploadBytes() });
  const existing = await prisma.lessonAttachment.count({ where: { lessonId, deletedAt: null } });
  if (existing >= MAX_ATTACHMENTS_PER_LESSON) {
    throw new AppError(409, 'TOO_MANY_ATTACHMENTS', `حداکثر ${MAX_ATTACHMENTS_PER_LESSON} ضمیمه برای هر جلسه مجاز است.`);
  }
  const body = Buffer.from(file.bytes);
  const storageKey = `lessons/${lessonId}/${randomUUID()}.${checked.ext}`; // random, unguessable, no user input
  await storage.put(storageKey, body, checked.mime);
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.lessonAttachment.create({
        data: {
          lessonId, storageKey, originalName: checked.displayName, mimeType: checked.mime,
          sizeBytes: checked.sizeBytes, sha256: createHash('sha256').update(body).digest('hex'), uploadedById: user.id,
        },
        select: publicSelect,
      });
      await writeAudit(tx, {
        actorId: user.id, ip, action: 'attachment.upload', entity: 'LessonAttachment', entityId: row.id,
        metadata: { lessonId, mime: checked.mime, sizeBytes: checked.sizeBytes },
      });
      return row;
    });
  } catch (error) {
    // The object exists but its row failed: remove it so no orphan is left behind.
    await storage.delete(storageKey).catch((e: unknown) => logger.error('attachment_orphan_cleanup_failed', { storageKey, error: e }));
    throw error;
  }
}

export async function listAttachments(user: SessionUser, lessonIdRaw: string) {
  const access = await resolveLessonAccess(user, parseId(lessonIdRaw));
  if (!access.canView) throw errors.forbidden();
  return prisma.lessonAttachment.findMany({
    where: { lessonId: access.lessonId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: publicSelect,
  });
}

/** Authorizes on the server, then returns a short-lived signed URL. Storage keys never reach the client. */
export async function createDownloadUrl(user: SessionUser, lessonIdRaw: string, attachmentIdRaw: string) {
  const access = await resolveLessonAccess(user, parseId(lessonIdRaw));
  if (!access.canView) throw errors.forbidden();
  const attachment = await prisma.lessonAttachment.findFirst({
    where: { id: parseId(attachmentIdRaw), lessonId: access.lessonId, deletedAt: null },
    select: { storageKey: true, originalName: true, mimeType: true },
  });
  if (!attachment) throw errors.notFound('فایل');
  const url = await requireStorage().signedDownloadUrl(attachment.storageKey, {
    fileName: attachment.originalName, contentType: attachment.mimeType,
  });
  logger.info('attachment_download', { userId: user.id, lessonId: access.lessonId, attachmentId: attachmentIdRaw });
  return url;
}

export async function deleteAttachment(user: SessionUser, attachmentIdRaw: string, ip: string | null) {
  const id = parseId(attachmentIdRaw);
  const attachment = await prisma.lessonAttachment.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, storageKey: true, lesson: { select: { section: { select: { courseId: true } } } } },
  });
  if (!attachment) throw errors.notFound('فایل');
  if (!(await canManageCourse(user, attachment.lesson.section.courseId))) throw errors.forbidden();
  await prisma.$transaction(async (tx) => {
    await tx.lessonAttachment.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit(tx, { actorId: user.id, ip, action: 'attachment.delete', entity: 'LessonAttachment', entityId: id });
  });
  await purgeOne(id, attachment.storageKey); // best effort; leftovers are retried by purgeDeletedAttachments
  return { id };
}

async function purgeOne(id: string, storageKey: string): Promise<boolean> {
  try {
    await requireStorage().delete(storageKey);
    await prisma.lessonAttachment.update({ where: { id }, data: { purgedAt: new Date() } });
    return true;
  } catch (error) {
    logger.warn('attachment_purge_failed', { attachmentId: id, error });
    return false;
  }
}

/** Retries storage deletion for soft-deleted rows whose object still exists (traceable via purgedAt). */
export async function purgeDeletedAttachments(actorId: string, ip: string | null, limit = 100) {
  const rows = await prisma.lessonAttachment.findMany({
    where: { deletedAt: { not: null }, purgedAt: null },
    orderBy: { deletedAt: 'asc' },
    take: limit,
    select: { id: true, storageKey: true },
  });
  let purged = 0;
  for (const r of rows) if (await purgeOne(r.id, r.storageKey)) purged++;
  await prisma.$transaction((tx) =>
    writeAudit(tx, { actorId, ip, action: 'attachment.purge', entity: 'LessonAttachment', metadata: { attempted: rows.length, purged } }),
  );
  return { attempted: rows.length, purged };
}
