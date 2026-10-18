import type { Metadata } from 'next';
import { CourseForm } from '@/components/admin/course-form';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { prisma } from '@/server/db/prisma';
import { ADMIN_ROLES, requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'دورهٔ جدید' };
export const dynamic = 'force-dynamic';

export default async function NewCoursePage() {
  await requireUser(ADMIN_ROLES);
  const [instructors, categories] = await Promise.all([
    prisma.instructor.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">دورهٔ جدید</h1>
      {instructors.length === 0 || categories.length === 0 ? (
        <EmptyState title="برای ساخت دوره حداقل یک مدرس و یک دسته‌بندی لازم است" description="مدیریت مدرس و دسته‌بندی در این فاز نیست؛ برای توسعه، رکوردهای موقت را مستقیم در دیتابیس محلی بسازید." />
      ) : (
        <Card className="p-6"><CourseForm instructors={instructors} categories={categories} /></Card>
      )}
    </div>
  );
}
