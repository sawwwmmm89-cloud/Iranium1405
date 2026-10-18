import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatToman } from '@/lib/utils';
import { prisma } from '@/server/db/prisma';
import { ADMIN_ROLES, requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'سفارش‌ها' };
export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  await requireUser(ADMIN_ROLES);
  const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, status: true, totalAmount: true, createdAt: true, user: { select: { email: true } } } });
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">سفارش‌ها</h1>
      {orders.length === 0 ? <EmptyState title="سفارشی ثبت نشده است" /> : (
        <ul className="space-y-2">{orders.map((o) => <li key={o.id}><Card className="flex flex-wrap justify-between gap-2 p-4 text-sm"><span dir="ltr">{o.user.email}</span><span>{o.createdAt.toLocaleDateString('fa-IR')} · {o.status}</span><b>{formatToman(o.totalAmount)}</b></Card></li>)}</ul>
      )}
    </div>
  );
}
