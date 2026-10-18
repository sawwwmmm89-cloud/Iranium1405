import type { Metadata } from 'next';
import Link from 'next/link';
import { EnrolledCourseCard } from '@/components/learning/enrolled-course-card';
import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { listEnrolledCourses } from '@/server/modules/learning/learning.service';
import { requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'دوره‌های من' };
export const dynamic = 'force-dynamic';

export default async function MyCoursesPage() {
  const user = await requireUser();
  const courses = await listEnrolledCourses(user.id);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">دوره‌های من</h1>
      {courses.length === 0 ? (
        <EmptyState title="هنوز در دوره‌ای ثبت‌نام نکرده‌اید" action={<Link href="/courses" className={buttonStyles({ size: 'sm' })}>مشاهده دوره‌ها</Link>} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{courses.map((c) => <li key={c.id}><EnrolledCourseCard course={c} /></li>)}</ul>
      )}
    </div>
  );
}
