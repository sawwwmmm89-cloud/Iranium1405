'use client';

import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { adminFetch } from '@/lib/admin-fetch';
import { useAction } from './use-action';

export interface LessonValues {
  id?: string; title: string; description: string | null; videoProvider: string | null; videoRef: string | null;
  durationSec: number; isFreePreview: boolean; attachmentUrl: string | null; status: 'DRAFT' | 'PUBLISHED' | 'DISABLED';
}

const orNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());

export function LessonForm({ sectionId, initial, onDone }: { sectionId: string; initial?: LessonValues; onDone?: () => void }) {
  const { busy, error, fields, run } = useAction();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const s = (k: string) => String(f.get(k) ?? '');
    const payload = {
      title: s('title'), description: orNull(s('description')), videoProvider: orNull(s('videoProvider')),
      videoRef: orNull(s('videoRef')), durationSec: s('durationSec').trim() === '' ? 0 : Number(s('durationSec')),
      isFreePreview: f.get('isFreePreview') === 'on', attachmentUrl: orNull(s('attachmentUrl')), status: s('status'),
    };
    const ok = await run(() => (initial?.id ? adminFetch(`/lessons/${initial.id}`, 'PATCH', payload) : adminFetch(`/sections/${sectionId}/lessons`, 'POST', payload)));
    if (ok) { if (!initial?.id) form.reset(); onDone?.(); }
  }
  const err = (k: string) => fields[k]?.[0];
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl bg-primary-soft/50 p-4" noValidate>
      <Input name="title" label="عنوان جلسه" defaultValue={initial?.title} error={err('title')} />
      <Textarea name="description" label="توضیح" rows={2} defaultValue={initial?.description ?? ''} error={err('description')} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="videoProvider" dir="ltr" label="ارائه‌دهندهٔ ویدئو" defaultValue={initial?.videoProvider ?? ''} error={err('videoProvider')} />
        <Input name="videoRef" dir="ltr" label="شناسهٔ ویدئو" defaultValue={initial?.videoRef ?? ''} error={err('videoRef')} />
        <Input name="durationSec" type="number" min={0} dir="ltr" label="مدت (ثانیه)" defaultValue={initial?.durationSec ?? 0} error={err('durationSec')} />
        <Input name="attachmentUrl" type="url" dir="ltr" label="آدرس فایل ضمیمه" defaultValue={initial?.attachmentUrl ?? ''} error={err('attachmentUrl')} />
        <Select name="status" label="وضعیت" defaultValue={initial?.status ?? 'DRAFT'}>
          <option value="DRAFT">پیش‌نویس</option><option value="PUBLISHED">منتشرشده</option><option value="DISABLED">غیرفعال</option>
        </Select>
      </div>
      <Checkbox name="isFreePreview" label="پیش‌نمایش رایگان" defaultChecked={initial?.isFreePreview} />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button type="submit" size="sm" loading={busy}>{initial?.id ? 'ذخیرهٔ جلسه' : 'افزودن جلسه'}</Button>
    </form>
  );
}
