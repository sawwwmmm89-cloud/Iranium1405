import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { listAdminPosts } from '@/server/modules/blog/blog-admin.service';
import { postListQuerySchema } from '@/server/modules/blog/blog.schema';
import { ADMIN_ROLES, requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'مدیریت وبلاگ' };
export const dynamic = 'force-dynamic';

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireUser(ADMIN_ROLES);
  const q = postListQuerySchema.parse(await searchParams);
  const { items } = await listAdminPosts(q);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">وبلاگ</h1><Link href="/admin/blog/new" className={buttonStyles()}>مقالهٔ جدید</Link></div>
      {items.length === 0 ? <EmptyState title="مقاله‌ای وجود ندارد" /> : (
        <ul className="space-y-3">{items.map((p) => <li key={p.id}><Link href={`/admin/blog/${p.id}`}><Card className="flex items-center justify-between gap-3 p-4 hover:shadow-lg"><span className="font-semibold">{p.title}</span><Badge tone={p.status === 'PUBLISHED' ? 'blue' : 'neutral'}>{p.status === 'PUBLISHED' ? 'منتشرشده' : 'پیش‌نویس'}</Badge></Card></Link></li>)}</ul>
      )}
    </div>
  );
}
