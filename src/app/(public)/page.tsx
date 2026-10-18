import Link from 'next/link';
import { HeroArt } from '@/components/home/hero-art';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatToman } from '@/lib/utils';
import { prisma } from '@/server/db/prisma';

export const dynamic = 'force-dynamic';

const why = [
  { t: 'یادگیری ساختارمند', d: 'دوره‌ها در فصل و جلسه سازمان‌دهی شده‌اند و پیشرفت شما ثبت می‌شود.' },
  { t: 'ویدئوی امن', d: 'محتوا فقط برای دانشجویان دوره و از طریق پخش‌کنندهٔ امن نمایش داده می‌شود.' },
  { t: 'کلاس‌های آنلاین', d: 'در کلاس‌های زنده شرکت کنید و مستقیم با مدرس ارتباط بگیرید.' },
];

const fa = (n: number) => n.toLocaleString('fa-IR');

// Database errors intentionally propagate to app/error.tsx (and are logged by Next on the server).
async function loadHome() {
  try {
    const [courses, categories, instructors, lives, students, courseCount, instructorCount, reviews] =
      await Promise.all([
        prisma.course.findMany({
          where: { status: 'PUBLISHED', featured: true, deletedAt: null },
          take: 6,
          orderBy: { createdAt: 'desc' },
          select: { id: true, slug: true, title: true, shortDesc: true, price: true, discountPrice: true, instructor: { select: { name: true } } },
        }),
        prisma.category.findMany({ take: 8, orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } }),
        prisma.instructor.findMany({ take: 4, select: { id: true, name: true, bio: true } }),
        prisma.liveClass.findMany({
          where: { deletedAt: null, status: { in: ['SCHEDULED', 'LIVE'] } },
          take: 3,
          orderBy: { startsAt: 'asc' },
          select: { id: true, title: true, startsAt: true, status: true },
        }),
        prisma.user.count({ where: { role: 'STUDENT', deletedAt: null } }),
        prisma.course.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
        prisma.instructor.count(),
        prisma.review.findMany({
          where: { status: 'APPROVED', deletedAt: null, body: { not: null } },
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: { id: true, rating: true, body: true, user: { select: { name: true } } },
        }),
      ]);
    return { courses, categories, instructors, lives, students, courseCount, instructorCount, reviews };
  } catch (error) {
    console.error('[v0] Homepage data unavailable:', error);
    return { courses: [], categories: [], instructors: [], lives: [], students: 0, courseCount: 0, instructorCount: 0, reviews: [] };
  }
}

export default async function HomePage() {
  const { courses, categories, instructors, lives, students, courseCount, instructorCount, reviews } = await loadHome();
  const stats = [
    ['دانشجو', students],
    ['دورهٔ منتشرشده', courseCount],
    ['مدرس', instructorCount],
  ] as const;

  return (
    <>
      <section className="container grid items-center gap-10 py-12 md:grid-cols-2 md:py-24" aria-labelledby="hero">
        <div className="space-y-6">
          <Badge tone="orange">پلتفرم آموزشی باما</Badge>
          <h1 id="hero" className="text-4xl font-extrabold leading-tight md:text-6xl">همه‌چی باما!</h1>
          <p className="max-w-md text-lg text-ink/70">یک تجربه مدرن برای یادگیری، آموزش و رشد.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/courses" className={buttonStyles({ size: 'lg' })}>مشاهده دوره‌ها</Link>
            <Link href="/live" className={buttonStyles({ variant: 'outline', size: 'lg' })}>کلاس‌های آنلاین</Link>
          </div>
        </div>
        <HeroArt />
      </section>

      <section className="container space-y-6 py-12" aria-labelledby="featured">
        <h2 id="featured" className="text-2xl font-bold">دوره‌های ویژه</h2>
        {courses.length === 0 ? (
          <EmptyState title="هنوز دورهٔ ویژه‌ای منتشر نشده است" description="به‌زودی دوره‌های جدید اینجا نمایش داده می‌شوند." />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <li key={c.id}>
                <Link href={`/courses/${c.slug}`} className="block h-full">
                  <Card className="h-full space-y-2 p-5 transition-shadow hover:shadow-lg">
                    <h3 className="font-semibold">{c.title}</h3>
                    <p className="line-clamp-2 text-sm text-ink/60">{c.shortDesc}</p>
                    <p className="text-sm text-ink/60">{c.instructor.name}</p>
                    <p className="font-semibold text-primary">{c.price === 0 ? 'رایگان' : formatToman(c.discountPrice ?? c.price)}</p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="container space-y-6 py-12" aria-labelledby="cats">
        <h2 id="cats" className="text-2xl font-bold">دسته‌بندی‌های آموزشی</h2>
        {categories.length === 0 ? (
          <EmptyState title="دسته‌بندی‌ها به‌زودی اضافه می‌شوند" />
        ) : (
          <ul className="flex flex-wrap gap-3">
            {categories.map((c) => (
              <li key={c.id}><Link href={`/courses?category=${encodeURIComponent(c.slug)}`} className={buttonStyles({ variant: 'outline' })}>{c.name}</Link></li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-primary-soft py-16" aria-labelledby="why">
        <div className="container space-y-8">
          <h2 id="why" className="text-2xl font-bold">چرا باما؟</h2>
          <ul className="grid gap-5 md:grid-cols-3">
            {why.map((w) => (
              <li key={w.t}><Card className="h-full space-y-2 p-6"><h3 className="font-semibold">{w.t}</h3><p className="text-sm text-ink/70">{w.d}</p></Card></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container space-y-6 py-12" aria-labelledby="live">
        <div className="flex items-center justify-between gap-4">
          <h2 id="live" className="text-2xl font-bold">کلاس‌های آنلاین</h2>
          <Link href="/live" className="text-sm text-primary hover:underline">همهٔ کلاس‌ها</Link>
        </div>
        {lives.length === 0 ? (
          <EmptyState title="کلاس زندهٔ پیش‌رویی ثبت نشده است" description="زمان‌بندی کلاس‌ها پس از ثبت اینجا نمایش داده می‌شود." />
        ) : (
          <ul className="grid gap-5 md:grid-cols-3">
            {lives.map((l) => (
              <li key={l.id}>
                <Link href={`/live/${l.id}`} className="block h-full">
                  <Card className="h-full space-y-2 p-5 transition-shadow hover:shadow-lg">
                    {l.status === 'LIVE' && <Badge tone="orange">در حال برگزاری</Badge>}
                    <h3 className="font-semibold">{l.title}</h3>
                    <time dateTime={l.startsAt.toISOString()} className="text-sm text-ink/60">
                      {l.startsAt.toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })}
                    </time>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="container space-y-6 py-12" aria-labelledby="inst">
        <h2 id="inst" className="text-2xl font-bold">مدرسان محبوب</h2>
        {instructors.length === 0 ? (
          <EmptyState title="مدرسان به‌زودی معرفی می‌شوند" />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {instructors.map((i) => (
              <li key={i.id}><Card className="h-full space-y-1 p-5"><h3 className="font-semibold">{i.name}</h3><p className="line-clamp-2 text-sm text-ink/60">{i.bio}</p></Card></li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-primary-soft py-12" aria-labelledby="stats">
        <div className="container space-y-6">
          <h2 id="stats" className="sr-only">آمار باما</h2>
          <dl className="grid grid-cols-3 gap-4 text-center">
            {stats.map(([label, value]) => (
              <div key={label}><dd className="text-3xl font-extrabold text-primary-deep">{fa(value)}</dd><dt className="text-sm text-ink/70">{label}</dt></div>
            ))}
          </dl>
        </div>
      </section>

      <section className="container space-y-6 py-12" aria-labelledby="testi">
        <h2 id="testi" className="text-2xl font-bold">نظر دانشجویان</h2>
        {reviews.length === 0 ? (
          <EmptyState title="هنوز نظری ثبت نشده است" description="نظرات تأییدشدهٔ دانشجویان اینجا نمایش داده می‌شود." />
        ) : (
          <ul className="grid gap-5 md:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.id}><Card className="h-full space-y-2 p-5"><p className="text-sm text-ink/80">{r.body}</p><p className="text-sm font-semibold">{r.user.name}</p></Card></li>
            ))}
          </ul>
        )}
      </section>

      <section className="container py-12">
        <Card className="space-y-3 bg-primary p-8 text-center text-white md:p-10">
          <h2 className="text-2xl font-bold">آمادهٔ شروع یادگیری هستید؟</h2>
          <p className="text-white/80">همین حالا ثبت‌نام کنید و اولین دوره‌تان را انتخاب کنید.</p>
          <div><Link href="/register" className={buttonStyles({ variant: 'accent', size: 'lg' })}>شروع کنید</Link></div>
        </Card>
      </section>
    </>
  );
}
