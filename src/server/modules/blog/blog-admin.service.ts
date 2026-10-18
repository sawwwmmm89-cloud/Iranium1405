import 'server-only';
import type { CommentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { errors } from '@/server/errors/app-error';
import type { AdminContext } from '@/server/modules/admin-courses/context';
import { parseId } from '@/server/modules/admin-courses/course.schema';
import { retryOnUnique } from '@/server/modules/admin-courses/retry';
import { generateUniqueSlug } from '@/server/modules/admin-courses/slug';
import { writeAudit } from '@/server/security/audit';
import type { CommentListQuery, CreatePostInput, PostListQuery, UpdatePostInput } from './blog.schema';

const postSelect = {
  id: true, slug: true, title: true, excerpt: true, content: true, coverImageUrl: true, categoryName: true,
  status: true, publishedAt: true, seoTitle: true, seoDescription: true, createdAt: true, updatedAt: true,
} as const;

export async function listAdminPosts(q: PostListQuery) {
  const where: Prisma.BlogPostWhereInput = {
    deletedAt: null,
    ...(q.status ? { status: q.status } : {}),
    ...(q.q ? { title: { contains: q.q, mode: 'insensitive' } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize, select: postSelect }),
    prisma.blogPost.count({ where }),
  ]);
  return { items, total };
}

export async function getAdminPost(idRaw: string) {
  const post = await prisma.blogPost.findFirst({ where: { id: parseId(idRaw), deletedAt: null }, select: postSelect });
  if (!post) throw errors.notFound('مقاله');
  return post;
}

export function createPost(input: CreatePostInput, ctx: AdminContext) {
  return retryOnUnique('slug', () =>
    prisma.$transaction(async (tx) => {
      const slug = await generateUniqueSlug(input.title, async (s) => !!(await tx.blogPost.findUnique({ where: { slug: s }, select: { id: true } })));
      const post = await tx.blogPost.create({ data: { ...input, slug, authorId: ctx.actorId, status: 'DRAFT' }, select: postSelect });
      await writeAudit(tx, { actorId: ctx.actorId, ip: ctx.ip, action: 'blog.create', entity: 'BlogPost', entityId: post.id, metadata: { slug } });
      return post;
    }),
  );
}

export function updatePost(idRaw: string, patch: UpdatePostInput, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    if (!(await tx.blogPost.findFirst({ where: { id, deletedAt: null }, select: { id: true } }))) throw errors.notFound('مقاله');
    const post = await tx.blogPost.update({ where: { id }, data: patch, select: postSelect }); // slug is never changed by PATCH
    await writeAudit(tx, { actorId: ctx.actorId, ip: ctx.ip, action: 'blog.update', entity: 'BlogPost', entityId: id, metadata: { fields: Object.keys(patch) } });
    return post;
  });
}

export function deletePost(idRaw: string, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    if (!(await tx.blogPost.findFirst({ where: { id, deletedAt: null }, select: { id: true } }))) throw errors.notFound('مقاله');
    await tx.blogPost.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit(tx, { actorId: ctx.actorId, ip: ctx.ip, action: 'blog.delete', entity: 'BlogPost', entityId: id });
    return { id };
  });
}

export function setPostPublished(idRaw: string, publish: boolean, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    const post = await tx.blogPost.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, publishedAt: true } });
    if (!post) throw errors.notFound('مقاله');
    const target = publish ? 'PUBLISHED' : 'DRAFT';
    if (post.status === target) return { id, status: target, changed: false };
    await tx.blogPost.update({ where: { id }, data: { status: target, ...(publish && !post.publishedAt ? { publishedAt: new Date() } : {}) } });
    await writeAudit(tx, { actorId: ctx.actorId, ip: ctx.ip, action: publish ? 'blog.publish' : 'blog.unpublish', entity: 'BlogPost', entityId: id });
    return { id, status: target, changed: true };
  });
}

const commentSelect = {
  id: true, body: true, status: true, createdAt: true,
  user: { select: { name: true, email: true } },
  post: { select: { id: true, title: true, slug: true } },
} as const;

export async function listAdminComments(q: CommentListQuery) {
  const where: Prisma.BlogCommentWhereInput = { deletedAt: null, ...(q.status ? { status: q.status } : {}) };
  const [items, total] = await Promise.all([
    prisma.blogComment.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize, select: commentSelect }),
    prisma.blogComment.count({ where }),
  ]);
  return { items, total };
}

const MODERATION_ACTION: Record<CommentStatus, string> = { APPROVED: 'comment.approve', REJECTED: 'comment.reject', PENDING: 'comment.reset' };

export function moderateComment(idRaw: string, status: CommentStatus, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    if (!(await tx.blogComment.findFirst({ where: { id, deletedAt: null }, select: { id: true } }))) throw errors.notFound('نظر');
    await tx.blogComment.update({ where: { id }, data: { status } });
    await writeAudit(tx, { actorId: ctx.actorId, ip: ctx.ip, action: MODERATION_ACTION[status], entity: 'BlogComment', entityId: id });
    return { id, status };
  });
}

export function deleteComment(idRaw: string, ctx: AdminContext) {
  const id = parseId(idRaw);
  return prisma.$transaction(async (tx) => {
    if (!(await tx.blogComment.findFirst({ where: { id, deletedAt: null }, select: { id: true } }))) throw errors.notFound('نظر');
    await tx.blogComment.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit(tx, { actorId: ctx.actorId, ip: ctx.ip, action: 'comment.delete', entity: 'BlogComment', entityId: id });
    return { id };
  });
}
