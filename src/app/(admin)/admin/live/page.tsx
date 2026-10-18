import type { Metadata } from 'next';
import { LiveManager } from '@/components/admin/live-manager';
import { EmptyState } from '@/components/ui/empty-state';
import { prisma } from '@/server/db/prisma';
import { listAdminLive } from '@/server/modules/live/live.service';
import { ADMIN_ROLES, requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'کلاس‌های زنده' };
export const dynamic = 'force-dynamic';

export default async function AdminLivePage() {
  await requireUser(ADMIN_ROLES);
  const [lives, instructors] = await Promise.all([listAdminLive(), prisma.instructor.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">کلاس‌های زنده</h1>
      {instructors.length === 0 ? <EmptyState title="برای ساخت کلاس حداقل یک مدرس لازم است" description="مدیریت مدرس هنوز پیاده‌سازی نشده؛ رکورد مدرس را مستقیم در دیتابیس بسازید." /> : (
        <LiveManager instructors={instructors} lives={lives.map((l) => ({ id: l.id, title: l.title, startsAt: l.startsAt.toISOString(), status: l.status, price: l.price }))} />
      )}
    </div>
  );
}
