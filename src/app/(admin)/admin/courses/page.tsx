import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatToman } from '@/lib/utils';
import { listAdminCourses } from '@/server/modules/admin-courses/admin-courses.service';
import { adminCourseListQuerySchema } from '@/server/modules/admin-courses/course.schema';
import { ADMIN_ROLES, requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'مدیریت دوره‌ها' };
export const dynamic = 'force-dynamic';

const STATUS = { DRAFT: 'پیش‌نویس', PUBLISHED: 'منتشرشده', ARCHIVED: 'بایگانی' } as const;

export default async function AdminCoursesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireUser(ADMIN_ROLES);
  const query = adminCourseListQuerySchema.parse(await searchParams);
  const { items, total } = await listAdminCourses(query);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">دوره‌ها <span className="text-base font-normal text-ink/50">({total.toLocaleString('fa-IR')})</span></h1>
        <Link href="/admin/courses/new" className={buttonStyles()}>دورهٔ جدید</Link>
      </div>
      <form className="flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={query.q} placeholder="جست‌وجوی عنوان" aria-label="جست‌وجو" className="h-11 flex-1 rounded-lg border border-ink/15 px-3" />
        <select name="status" defaultValue={query.status ?? ''} aria-label="وضعیت" className="h-11 rounded-lg border border-ink/15 bg-white px-3">
          <option value="">همهٔ وضعیت‌ها</option><option value="DRAFT">پیش‌نویس</option><option value="PUBLISHED">منتشرشده</option>
        </select>
        <button className={buttonStyles({ variant: 'outline' })}>فیلتر</button>
      </form>
      {items.length === 0 ? <EmptyState title="دوره‌ای پیدا نشد" action={<Link href="/admin/courses/new" className={buttonStyles({ size: 'sm' })}>ساخت دوره</Link>} /> : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/courses/${c.id}`}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-shadow hover:shadow-lg">
                  <div><p className="font-semibold">{c.title}</p><p dir="ltr" className="text-start text-xs text-ink/50">/{c.slug}</p></div>
                  <div className="flex items-center gap-3 text-sm">
                    <span>{c.price === 0 ? 'رایگان' : formatToman(c.discountPrice ?? c.price)}</span>
                    <Badge tone={c.status === 'PUBLISHED' ? 'blue' : 'neutral'}>{STATUS[c.status]}</Badge>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
