import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { BuyButton, EnrollButton } from '@/components/commerce/commerce-buttons';
import { buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatToman } from '@/lib/utils';
import { prisma } from '@/server/db/prisma';
import { getSessionUser } from '@/server/security/session';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!z.string().uuid().safeParse(id).success) notFound();
  try {
    const live = await prisma.liveClass.findFirst({
      where: { id, deletedAt: null },
      include: { instructor: { select: { name: true } } },
    });
    if (!live) notFound();
    return live;
  } catch (error) {
    console.error('[bama] live detail unavailable:', error);
    notFound();
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const live = await load((await params).id);
  return { title: live.title, description: live.description.slice(0, 160) };
}

export default async function LiveDetailPage({ params }: Props) {
  const live = await load((await params).id);
  const user = await getSessionUser();
  const enrolled = user ? !!(await prisma.liveEnrollment.findUnique({ where: { userId_liveClassId: { userId: user.id, liveClassId: live.id } }, select: { id: true } })) : false;
  const open = live.status === 'SCHEDULED' || live.status === 'LIVE';
  return (
    <div className="container grid gap-8 py-12 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Badge>{live.status === 'LIVE' ? 'در حال برگزاری' : live.status === 'SCHEDULED' ? 'زمان‌بندی‌شده' : live.status === 'FINISHED' ? 'پایان‌یافته' : 'لغوشده'}</Badge>
        <h1 className="text-3xl font-bold">{live.title}</h1>
        <p className="text-ink/70">{live.description}</p>
      </div>
      <Card className="h-fit space-y-3 p-6">
        <p className="text-2xl font-bold text-primary">{live.price === 0 ? 'رایگان' : formatToman(live.price)}</p>
        <p className="text-sm text-ink/60">مدرس: {live.instructor.name}</p>
        <time dateTime={live.startsAt.toISOString()} className="block text-sm">{live.startsAt.toLocaleString('fa-IR', { dateStyle: 'full', timeStyle: 'short' })}</time>
        {!open ? <p className="text-sm text-ink/60">ثبت‌نام این کلاس بسته است.</p>
          : enrolled ? <p className="text-sm font-medium text-primary">شما در این کلاس ثبت‌نام کرده‌اید.</p>
          : !user ? <Link href={`/login?next=/live/${live.id}`} className={buttonStyles({ className: 'w-full' })}>برای ثبت‌نام وارد شوید</Link>
          : live.price === 0 ? <EnrollButton url={`/live/${live.id}/enroll`} label="ثبت‌نام" />
          : <BuyButton liveClassId={live.id} />}
        <p className="text-xs text-ink/50">پخش زنده پس از پیکربندی سرویس ارائه‌دهنده فعال می‌شود.</p>
      </Card>
    </div>
  );
}
