import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatToman } from '@/lib/utils';
import { listCourses, listQuerySchema } from '@/server/modules/courses/courses.service';

export const metadata: Metadata = { title: 'دوره‌ها' };
export const dynamic = 'force-dynamic';

export default async function CoursesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = listQuerySchema.parse(await searchParams);
  const { items } = await listCourses(query);
  return (
    <div className="container space-y-6 py-12">
      <h1 className="text-3xl font-bold">دوره‌ها</h1>
      {items.length === 0 ? (
        <EmptyState title="دوره‌ای پیدا نشد" description="به‌زودی دوره‌های جدید منتشر می‌شوند." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Link key={c.id} href={`/courses/${c.slug}`}>
              <Card className="h-full space-y-2 p-5 transition-shadow hover:shadow-lg">
                <h2 className="font-semibold">{c.title}</h2>
                <p className="line-clamp-2 text-sm text-ink/60">{c.shortDesc}</p>
                <p className="text-sm text-ink/60">{c.instructor.name}</p>
                <p className="font-semibold text-primary">{c.price === 0 ? 'رایگان' : formatToman(c.discountPrice ?? c.price)}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
