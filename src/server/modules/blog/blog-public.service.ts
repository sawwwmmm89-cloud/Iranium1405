import 'server-only';
import { assertRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/server/db/prisma';
import { errors } from '@/server/errors/app-error';
import type { SessionUser } from '@/server/security/session';

const live = () => ({ status: 'PUBLISHED' as const, deletedAt: null, publishedAt: { lte: new Date() } });

export async function listPublishedPosts(page: number, pageSize: number) {
  const where = live();
  try {
    const [items, total] = await Promise.all([
      prisma.blogPost.findMany({
        where, orderBy: { publishedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, slug: true, title: true, excerpt: true, coverImageUrl: true, categoryName: true, publishedAt: true, author: { select: { name: true } } },
      }),
      prisma.blogPost.count({ where }),
    ]);
    return { items, total };
  } catch (error) {
    console.error('[bama] blog unavailable:', error);
    return { items: [], total: 0 };
  }
}

/** Drafts/unpublished/deleted posts are indistinguishable from non-existent ones for the public. */
export async function getPublishedPost(slug: string) {
  const post = await prisma.blogPost.findFirst({
    where: { slug, ...live() },
    select: {
      id: true, slug: true, title: true, excerpt: true, content: true, coverImageUrl: true, categoryName: true,
      publishedAt: true, seoTitle: true, seoDescription: true, author: { select: { name: true } },
    },
  });
  if (!post) throw errors.notFound('مقاله');
  const comments = await prisma.blogComment.findMany({
    where: { postId: post.id, status: 'APPROVED', deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, body: true, createdAt: true, user: { select: { name: true } } },
  });
  return { post, comments };
}

export async function addComment(user: SessionUser, slug: string, body: string) {
  assertRateLimit(`comment:${user.id}`, 5, 60_000);
  const post = await prisma.blogPost.findFirst({ where: { slug, ...live() }, select: { id: true } });
  if (!post) throw errors.notFound('مقاله');
  return prisma.blogComment.create({ data: { postId: post.id, userId: user.id, body, status: 'PENDING' }, select: { id: true, status: true } });
}
