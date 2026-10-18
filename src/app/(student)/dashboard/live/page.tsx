import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { prisma } from '@/server/db/prisma';
import { requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'کلاس‌های زنده من' };
export const dynamic = 'force-dynamic';

export default async function MyLivePage() {
  const user = await requireUser();
  const items = await prisma.liveEnrollment.findMany({
    where: { userId: user.id, liveClass: { deletedAt: null } },
    orderBy: { liveClass: { startsAt: 'asc' } },
    select: { id: true, liveClass: { select: { id: true, title: true, startsAt: true } } },
  });
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">کلاس‌های زنده من</h1>
      {items.length === 0 ? <EmptyState title="در کلاس زنده‌ای ثبت‌نام نکرده‌اید" description={undefined} /> : (
        <ul className="space-y-2">{items.map((i) => <li key={i.id}><Link href={`/live/${i.liveClass.id}`}><Card className="flex justify-between p-4 text-sm"><span>{i.liveClass.title}</span><time dateTime={i.liveClass.startsAt.toISOString()}>{i.liveClass.startsAt.toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })}</time></Card></Link></li>)}</ul>
      )}
    </div>
  );
}
