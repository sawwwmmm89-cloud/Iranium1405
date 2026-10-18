import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { prisma } from '@/server/db/prisma';
import { listLessons } from '@/server/modules/courses/courses.service';
import { requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'کلاس دوره' };
export const dynamic = 'force-dynamic';

export default async function CourseRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await requireUser();
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: id } },
    select: { course: { select: { title: true } } },
  });
  if (!enrollment) notFound(); // not enrolled: do not reveal course existence or content
  const { sections } = await listLessons(id);
  const lessonIds = sections.flatMap((sec) => sec.lessons.map((l) => l.id));
  const attachments = await prisma.lessonAttachment.findMany({ where: { lessonId: { in: lessonIds }, deletedAt: null }, orderBy: { createdAt: 'asc' }, select: { id: true, lessonId: true, originalName: true, sizeBytes: true } });
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">{enrollment.course.title}</h1>
      <EmptyState title="پخش‌کنندهٔ ویدئو هنوز فعال نشده است" description="پخش امن ویدئو پس از اتصال سرویس ویدئو در Phase 5 اضافه می‌شود." />
      {sections.map((s) => (
        <Card key={s.id} className="p-4"><h2 className="font-semibold">{s.title}</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink/70">{s.lessons.map((l) => <li key={l.id}>{l.title}{attachments.filter((a) => a.lessonId === l.id).map((a) => (<a key={a.id} href={`/api/v1/lessons/${l.id}/attachments/${a.id}/download`} className="ms-3 text-primary underline" rel="nofollow">{a.originalName} ({Math.ceil(a.sizeBytes / 1024).toLocaleString('fa-IR')} کیلوبایت)</a>))}</li>)}</ul>
        </Card>
      ))}
    </div>
  );
}
