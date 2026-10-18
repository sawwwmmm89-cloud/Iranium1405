'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/admin-fetch';
import { useAction } from './use-action';

export function CourseActions({ courseId, status }: { courseId: string; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }) {
  const router = useRouter();
  const { busy, error, run } = useAction();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === 'DRAFT' && <Button size="sm" loading={busy} onClick={() => run(() => adminFetch(`/courses/${courseId}/publish`, 'POST'))}>انتشار</Button>}
        {status === 'PUBLISHED' && <Button size="sm" variant="outline" loading={busy} onClick={() => run(() => adminFetch(`/courses/${courseId}/unpublish`, 'POST'))}>لغو انتشار</Button>}
        <Button size="sm" variant="outline" loading={busy} onClick={() => run(() => adminFetch<{ id: string }>(`/courses/${courseId}/duplicate`, 'POST'), (c) => router.push(`/admin/courses/${c.id}`))}>کپی دوره</Button>
        <Button size="sm" variant="ghost" loading={busy} className="text-red-600" onClick={() => { if (window.confirm('این دوره حذف شود؟')) void run(() => adminFetch(`/courses/${courseId}`, 'DELETE'), () => router.push('/admin/courses')); }}>حذف</Button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
