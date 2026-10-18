import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { prisma } from '@/server/db/prisma';
import { requireUser, ADMIN_ROLES } from '@/server/security/session';

export const metadata: Metadata = { title: 'پنل مدیریت' };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireUser(ADMIN_ROLES);
  const [users, courses, revenue, students, live, orders] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.course.count({ where: { deletedAt: null } }),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.enrollment.groupBy({ by: ['userId'] }).then((r) => r.length),
    prisma.liveClass.count({ where: { deletedAt: null } }),
    prisma.order.count(),
  ]);
  const cards = [
    ['کل کاربران', users], ['کل دوره‌ها', courses], ['درآمد کل', (revenue._sum.amount ?? 0)],
    ['دانشجویان فعال', students], ['کلاس‌های زنده', live], ['سفارش‌ها', orders],
  ] as const;
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <h1 className="text-2xl font-bold">داشبورد مدیریت</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card key={label} className="p-5"><p className="text-sm text-ink/60">{label}</p><p className="mt-1 text-2xl font-bold">{value.toLocaleString('fa-IR')}</p></Card>
        ))}
      </div>
      <EmptyState title="نمودارها پس از ثبت داده‌های واقعی فعال می‌شوند" description="درآمد، کاربران جدید و فروش دوره‌ها در فازهای بعد اضافه می‌شود." />
    </div>
  );
}
