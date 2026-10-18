import type { Metadata } from 'next';
import Link from 'next/link';
import { EnrolledCourseCard } from '@/components/learning/enrolled-course-card';
import { Avatar } from '@/components/ui/avatar';
import { buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatToman } from '@/lib/utils';
import { prisma } from '@/server/db/prisma';
import { listEnrolledCourses } from '@/server/modules/learning/learning.service';
import { requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'داشبورد' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();
  const [courses, orders, lives] = await Promise.all([
    listEnrolledCourses(user.id, 6),
    prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.liveEnrollment.findMany({
      where: { userId: user.id, liveClass: { deletedAt: null, status: { in: ['SCHEDULED', 'LIVE'] } } },
      take: 3,
      orderBy: { liveClass: { startsAt: 'asc' } },
      select: { id: true, liveClass: { select: { id: true, title: true, startsAt: true } } },
    }),
  ]);
  const inProgress = courses.find((c) => c.percent < 100);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} />
        <div><h1 className="text-2xl font-bold">سلام، {user.name}</h1><p className="text-sm text-ink/60">خوش آمدید.</p></div>
      </div>

      <section className="space-y-3" aria-labelledby="continue">
        <h2 id="continue" className="font-semibold">ادامهٔ یادگیری</h2>
        {inProgress ? <EnrolledCourseCard course={inProgress} /> : (
          <EmptyState title="دورهٔ در حال یادگیری ندارید" description="پس از ثبت‌نام در یک دوره، ادامهٔ یادگیری اینجا نمایش داده می‌شود." action={<Link href="/courses" className={buttonStyles({ size: 'sm' })}>مشاهده دوره‌ها</Link>} />
        )}
      </section>

      <section className="space-y-3" aria-labelledby="mine">
        <h2 id="mine" className="font-semibold">دوره‌های من و پیشرفت</h2>
        {courses.length === 0 ? <EmptyState title="هنوز در دوره‌ای ثبت‌نام نکرده‌اید" /> : (
          <ul className="grid gap-4 sm:grid-cols-2">{courses.map((c) => <li key={c.id}><EnrolledCourseCard course={c} /></li>)}</ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="lives">
        <h2 id="lives" className="font-semibold">کلاس‌های زندهٔ پیش‌رو</h2>
        {lives.length === 0 ? <EmptyState title="کلاسی ثبت نشده است" /> : (
          <ul className="space-y-2">{lives.map((l) => <li key={l.id}><Card className="flex justify-between p-4 text-sm"><span>{l.liveClass.title}</span><time dateTime={l.liveClass.startsAt.toISOString()}>{l.liveClass.startsAt.toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })}</time></Card></li>)}</ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="orders">
        <h2 id="orders" className="font-semibold">سفارش‌های اخیر</h2>
        {orders.length === 0 ? <EmptyState title="سفارشی وجود ندارد" /> : (
          <ul className="space-y-2">{orders.map((o) => <li key={o.id}><Card className="flex justify-between p-4 text-sm"><span>{o.status}</span><span>{formatToman(o.totalAmount)}</span></Card></li>)}</ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="profile">
        <h2 id="profile" className="font-semibold">پروفایل</h2>
        <Card className="space-y-1 p-4 text-sm"><p>{user.name}</p><p dir="ltr" className="text-start text-ink/60">{user.email}</p><Link href="/dashboard/profile" className="text-primary hover:underline">مشاهدهٔ پروفایل</Link></Card>
      </section>
    </div>
  );
}
