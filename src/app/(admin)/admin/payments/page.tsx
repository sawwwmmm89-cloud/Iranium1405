import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatToman } from '@/lib/utils';
import { prisma } from '@/server/db/prisma';
import { ADMIN_ROLES, requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'پرداخت‌ها' };
export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  await requireUser(ADMIN_ROLES);
  const payments = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, status: true, amount: true, refId: true, authority: true, createdAt: true, user: { select: { email: true } } } });
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">پرداخت‌ها</h1>
      {payments.length === 0 ? <EmptyState title="پرداختی ثبت نشده است" /> : (
        <ul className="space-y-2">{payments.map((p) => <li key={p.id}><Card className="flex flex-wrap justify-between gap-2 p-4 text-sm"><span dir="ltr">{p.user.email}</span><span>{p.status}{p.refId ? ` · ref ${p.refId}` : ''}</span><span dir="ltr">…{p.authority?.slice(-6)}</span><b>{formatToman(p.amount)}</b></Card></li>)}</ul>
      )}
    </div>
  );
}
