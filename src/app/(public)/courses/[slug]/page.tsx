import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { BuyButton, EnrollButton } from '@/components/commerce/commerce-buttons';
import { buttonStyles } from '@/components/ui/button';
import { formatToman } from '@/lib/utils';
import { prisma } from '@/server/db/prisma';
import { getSessionUser } from '@/server/security/session';
import { AppError } from '@/server/errors/app-error';
import { getCourse, listLessons } from '@/server/modules/courses/courses.service';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  try {
    return await getCourse(slug);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await load((await params).slug);
  return { title: c.seoTitle ?? c.title, description: c.seoDescription ?? c.shortDesc, alternates: { canonical: `/courses/${c.slug}` } };
}

export default async function CoursePage({ params }: Props) {
  const course = await load((await params).slug);
  const { sections } = await listLessons(course.id);
  const user = await getSessionUser();
  const enrolled = user ? !!(await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } }, select: { id: true } })) : false;
  const effective = course.discountPrice ?? course.price;
  return (
    <div className="container grid gap-8 py-12 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Badge>{course.category.name}</Badge>
        <h1 className="text-3xl font-bold">{course.title}</h1>
        <p className="text-ink/70">{course.description}</p>
        <h2 className="text-xl font-semibold">سرفصل‌ها</h2>
        {sections.length === 0 ? (
          <p className="text-sm text-ink/60">سرفصل‌ها هنوز اضافه نشده‌اند.</p>
        ) : (
          sections.map((s) => (
            <Card key={s.id} className="p-4">
              <h3 className="font-semibold">{s.title}</h3>
              <ul className="mt-2 space-y-1 text-sm text-ink/70">
                {s.lessons.map((l) => (<li key={l.id}>{l.title}{l.isFreePreview && <Badge tone="orange" className="ms-2">پیش‌نمایش رایگان</Badge>}</li>))}
              </ul>
            </Card>
          ))
        )}
      </div>
      <Card className="h-fit space-y-3 p-6">
        <p className="text-2xl font-bold text-primary">{course.price === 0 ? 'رایگان' : formatToman(course.discountPrice ?? course.price)}</p>
        <p className="text-sm text-ink/60">مدرس: {course.instructor.name}</p>
        {enrolled ? (
          <Link href={`/dashboard/courses/${course.id}`} className={buttonStyles({ className: 'w-full' })}>ورود به کلاس</Link>
        ) : !user ? (
          <Link href={`/login?next=/courses/${course.slug}`} className={buttonStyles({ className: 'w-full' })}>برای ثبت‌نام وارد شوید</Link>
        ) : effective === 0 ? (
          <EnrollButton url={`/courses/${course.id}/enroll`} />
        ) : (
          <BuyButton courseId={course.id} />
        )}
      </Card>
    </div>
  );
}
