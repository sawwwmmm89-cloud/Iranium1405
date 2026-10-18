import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { CourseActions } from '@/components/admin/course-actions';
import { CourseForm } from '@/components/admin/course-form';
import { CurriculumEditor } from '@/components/admin/curriculum-editor';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AppError } from '@/server/errors/app-error';
import { prisma } from '@/server/db/prisma';
import { getAdminCourse } from '@/server/modules/admin-courses/admin-courses.service';
import { ADMIN_ROLES, requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'ویرایش دوره' };
export const dynamic = 'force-dynamic';

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  await requireUser(ADMIN_ROLES);
  const course = await getAdminCourse(id).catch((e: unknown) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const [instructors, categories] = await Promise.all([
    prisma.instructor.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1"><h1 className="text-2xl font-bold">{course.title}</h1><p dir="ltr" className="text-start text-xs text-ink/50">/{course.slug}</p></div>
        <Badge tone={course.status === 'PUBLISHED' ? 'blue' : 'neutral'}>{course.status}</Badge>
      </div>
      <CourseActions courseId={course.id} status={course.status} />
      <Card className="p-6">
        <CourseForm
          courseId={course.id}
          instructors={instructors}
          categories={categories}
          initial={{
            title: course.title, shortDesc: course.shortDesc, description: course.description,
            thumbnail: course.thumbnail, cover: course.cover, price: course.price, discountPrice: course.discountPrice,
            instructorId: course.instructorId, categoryId: course.categoryId, level: course.level,
            durationMin: course.durationMin, featured: course.featured, seoTitle: course.seoTitle, seoDescription: course.seoDescription,
          }}
        />
      </Card>
      <section className="space-y-4" aria-labelledby="curriculum">
        <h2 id="curriculum" className="text-xl font-bold">سرفصل‌ها و جلسه‌ها</h2>
        <CurriculumEditor courseId={course.id} sections={course.sections} />
      </section>
    </div>
  );
}
