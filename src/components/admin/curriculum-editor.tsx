'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { adminFetch } from '@/lib/admin-fetch';
import { AttachmentsPanel } from './attachments-panel';
import { LessonForm, type LessonValues } from './lesson-form';
import { useAction } from './use-action';

export interface SectionView { id: string; title: string; lessons: (LessonValues & { id: string })[] }

const move = (ids: string[], index: number, delta: -1 | 1): string[] => {
  const next = [...ids];
  const target = index + delta;
  const a = next[index];
  const b = next[target];
  if (a === undefined || b === undefined) return ids;
  next[index] = b;
  next[target] = a;
  return next;
};

function LessonRow({ lesson, sectionId, index, ids }: { lesson: LessonValues & { id: string }; sectionId: string; index: number; ids: string[] }) {
  const { busy, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  return (
    <li className="space-y-2 rounded-lg border border-ink/[.08] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{lesson.title}</span>
        <Badge tone={lesson.status === 'PUBLISHED' ? 'blue' : 'neutral'}>{lesson.status}</Badge>
        {lesson.isFreePreview && <Badge tone="orange">پیش‌نمایش</Badge>}
        <span className="ms-auto flex gap-1">
          <Button size="sm" variant="ghost" disabled={busy || index === 0} aria-label="انتقال به بالا" onClick={() => run(() => adminFetch(`/sections/${sectionId}/lessons/order`, 'PUT', { ids: move(ids, index, -1) }))}>↑</Button>
          <Button size="sm" variant="ghost" disabled={busy || index === ids.length - 1} aria-label="انتقال به پایین" onClick={() => run(() => adminFetch(`/sections/${sectionId}/lessons/order`, 'PUT', { ids: move(ids, index, 1) }))}>↓</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing((e) => !e)}>{editing ? 'بستن' : 'ویرایش'}</Button>
          <Button size="sm" variant="ghost" className="text-red-600" disabled={busy} onClick={() => { if (window.confirm('این جلسه حذف شود؟')) void run(() => adminFetch(`/lessons/${lesson.id}`, 'DELETE')); }}>حذف</Button>
        </span>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {editing && (<><LessonForm sectionId={sectionId} initial={lesson} onDone={() => setEditing(false)} /><AttachmentsPanel lessonId={lesson.id} /></>)}
    </li>
  );
}

function SectionCard({ section, index, sectionIds, courseId }: { section: SectionView; index: number; sectionIds: string[]; courseId: string }) {
  const { busy, error, run } = useAction();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState(section.title);
  const lessonIds = section.lessons.map((l) => l.id);
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1"><Input label="عنوان فصل" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <Button size="sm" variant="outline" disabled={busy || title.trim() === section.title} onClick={() => run(() => adminFetch(`/sections/${section.id}`, 'PATCH', { title }))}>ذخیره</Button>
        <Button size="sm" variant="ghost" disabled={busy || index === 0} aria-label="فصل به بالا" onClick={() => run(() => adminFetch(`/courses/${courseId}/sections/order`, 'PUT', { ids: move(sectionIds, index, -1) }))}>↑</Button>
        <Button size="sm" variant="ghost" disabled={busy || index === sectionIds.length - 1} aria-label="فصل به پایین" onClick={() => run(() => adminFetch(`/courses/${courseId}/sections/order`, 'PUT', { ids: move(sectionIds, index, 1) }))}>↓</Button>
        <Button size="sm" variant="ghost" className="text-red-600" disabled={busy} onClick={() => { if (window.confirm('این فصل حذف شود؟ (فقط فصل خالی حذف می‌شود)')) void run(() => adminFetch(`/sections/${section.id}`, 'DELETE')); }}>حذف فصل</Button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {section.lessons.length === 0 ? <p className="text-sm text-ink/60">جلسه‌ای ندارد.</p> : (
        <ul className="space-y-2">{section.lessons.map((l, i) => <LessonRow key={l.id} lesson={l} sectionId={section.id} index={i} ids={lessonIds} />)}</ul>
      )}
      {adding ? <LessonForm sectionId={section.id} onDone={() => setAdding(false)} /> : <Button size="sm" variant="outline" onClick={() => setAdding(true)}>+ جلسهٔ جدید</Button>}
    </Card>
  );
}

export function CurriculumEditor({ courseId, sections }: { courseId: string; sections: SectionView[] }) {
  const [title, setTitle] = useState('');
  const { busy, error, fields, run } = useAction();
  const ids = sections.map((s) => s.id);
  return (
    <div className="space-y-4">
      {sections.length === 0 ? <EmptyState title="هنوز فصلی ندارد" description="اولین فصل را اضافه کنید." /> : sections.map((s, i) => <SectionCard key={s.id} section={s} index={i} sectionIds={ids} courseId={courseId} />)}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1"><Input label="فصل جدید" value={title} onChange={(e) => setTitle(e.target.value)} error={fields.title?.[0]} /></div>
        <Button loading={busy} onClick={() => run(() => adminFetch('/courses/' + courseId + '/sections', 'POST', { title }), () => { setTitle(''); })}>افزودن فصل</Button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
