import type { Metadata } from 'next';
import { CommentsTable } from '@/components/admin/comments-table';
import { EmptyState } from '@/components/ui/empty-state';
import { listAdminComments } from '@/server/modules/blog/blog-admin.service';
import { commentListQuerySchema } from '@/server/modules/blog/blog.schema';
import { ADMIN_ROLES, requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'نظرات وبلاگ' };
export const dynamic = 'force-dynamic';

export default async function AdminCommentsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireUser(ADMIN_ROLES);
  const q = commentListQuerySchema.parse(await searchParams);
  const { items } = await listAdminComments(q);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">نظرات وبلاگ</h1>
      <nav className="flex gap-3 text-sm" aria-label="فیلتر وضعیت"><a href="?">همه</a><a href="?status=PENDING">در انتظار</a><a href="?status=APPROVED">تأییدشده</a><a href="?status=REJECTED">ردشده</a></nav>
      {items.length === 0 ? <EmptyState title="نظری وجود ندارد" /> : <CommentsTable comments={items.map((c) => ({ id: c.id, body: c.body, status: c.status, author: c.user.name, postTitle: c.post.title }))} />}
    </div>
  );
}
