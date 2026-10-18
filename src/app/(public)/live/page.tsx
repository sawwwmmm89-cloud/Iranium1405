import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatToman } from '@/lib/utils';
import { prisma } from '@/server/db/prisma';

export const metadata: Metadata = { title: 'کلاس‌های آنلاین' };
export const dynamic = 'force-dynamic';

export default async function LivePage() {
  const lives = await prisma.liveClass.findMany({
    where: { deletedAt: null, status: { in: ['SCHEDULED', 'LIVE'] } },
    orderBy: { startsAt: 'asc' },
    select: { id: true, title: true, description: true, startsAt: true, status: true, price: true, instructor: { select: { name: true } } },
  });
  return (
    <div className="container space-y-6 py-12">
      <h1 className="text-3xl font-bold">کلاس‌های آنلاین</h1>
      {lives.length === 0 ? (
        <EmptyState title="کلاس زندهٔ پیش‌رویی ثبت نشده است" description="کلاس‌های جدید پس از زمان‌بندی اینجا نمایش داده می‌شوند." />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lives.map((l) => (
            <li key={l.id}>
              <Link href={`/live/${l.id}`} className="block h-full">
                <Card className="h-full space-y-2 p-5 transition-shadow hover:shadow-lg">
                  {l.status === 'LIVE' && <Badge tone="orange">در حال برگزاری</Badge>}
                  <h2 className="font-semibold">{l.title}</h2>
                  <p className="line-clamp-2 text-sm text-ink/60">{l.description}</p>
                  <p className="text-sm text-ink/60">{l.instructor.name}</p>
                  <time dateTime={l.startsAt.toISOString()} className="block text-sm">{l.startsAt.toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                  <p className="font-semibold text-primary">{l.price === 0 ? 'رایگان' : formatToman(l.price)}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
