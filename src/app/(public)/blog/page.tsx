import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { listPublishedPosts } from '@/server/modules/blog/blog-public.service';
import { postListQuerySchema } from '@/server/modules/blog/blog.schema';

export const metadata: Metadata = { title: 'وبلاگ', alternates: { canonical: '/blog' } };
export const dynamic = 'force-dynamic';

export default async function BlogPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const q = postListQuerySchema.parse(await searchParams);
  const { items, total } = await listPublishedPosts(q.page, q.pageSize);
  const pages = Math.max(1, Math.ceil(total / q.pageSize));
  return (
    <div className="container space-y-6 py-12">
      <h1 className="text-3xl font-bold">وبلاگ</h1>
      {items.length === 0 ? <EmptyState title="هنوز مقاله‌ای منتشر نشده است" /> : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`/blog/${encodeURIComponent(p.slug)}`} className="block h-full">
                <Card className="h-full space-y-2 p-5 transition-shadow hover:shadow-lg">
                  {p.categoryName && <p className="text-xs text-primary">{p.categoryName}</p>}
                  <h2 className="font-semibold">{p.title}</h2>
                  <p className="line-clamp-3 text-sm text-ink/60">{p.excerpt}</p>
                  <p className="text-xs text-ink/50">{p.author.name}{p.publishedAt ? ` · ${p.publishedAt.toLocaleDateString('fa-IR')}` : ''}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="صفحه‌بندی" className="flex items-center justify-center gap-4 text-sm">
          {q.page > 1 && <Link href={`/blog?page=${q.page - 1}`}>قبلی</Link>}
          <span>{q.page.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}</span>
          {q.page < pages && <Link href={`/blog?page=${q.page + 1}`}>بعدی</Link>}
        </nav>
      )}
    </div>
  );
}
