import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { BlogForm } from '@/components/admin/blog-form';
import { Card } from '@/components/ui/card';
import { AppError } from '@/server/errors/app-error';
import { getAdminPost } from '@/server/modules/blog/blog-admin.service';
import { ADMIN_ROLES, requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'ویرایش مقاله' };
export const dynamic = 'force-dynamic';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  await requireUser(ADMIN_ROLES);
  const post = await getAdminPost(id).catch((e: unknown) => { if (e instanceof AppError && e.status === 404) notFound(); throw e; });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{post.title}</h1>
      <Card className="p-6"><BlogForm postId={post.id} status={post.status} initial={{ title: post.title, excerpt: post.excerpt, content: post.content, coverImageUrl: post.coverImageUrl, categoryName: post.categoryName, seoTitle: post.seoTitle, seoDescription: post.seoDescription }} /></Card>
    </div>
  );
}
