'use client';

import type { FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { adminFetch } from '@/lib/admin-fetch';
import { useAction } from './use-action';

export interface LiveRow { id: string; title: string; startsAt: string; status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED'; price: number }

function Item({ live }: { live: LiveRow }) {
  const { busy, error, run } = useAction();
  const set = (status: LiveRow['status']) => run(() => adminFetch(`/live/${live.id}/status`, 'POST', { status }));
  return (
    <li className="space-y-2 rounded-xl border border-ink/[.08] bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{live.title}</span><Badge>{live.status}</Badge></div>
      <time dateTime={live.startsAt}>{new Date(live.startsAt).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })}</time>
      <div className="flex flex-wrap gap-2">
        {(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED'] as const).map((s) => <Button key={s} size="sm" variant={s === live.status ? 'primary' : 'outline'} disabled={busy || s === live.status} onClick={() => set(s)}>{s}</Button>)}
        <Button size="sm" variant="ghost" className="text-red-600" disabled={busy} onClick={() => { if (window.confirm('این کلاس حذف شود؟')) void run(() => adminFetch(`/live/${live.id}`, 'DELETE')); }}>حذف</Button>
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </li>
  );
}

export function LiveManager({ lives, instructors }: { lives: LiveRow[]; instructors: { id: string; name: string }[] }) {
  const { busy, error, fields, run } = useAction();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const s = (k: string) => String(f.get(k) ?? '');
    const capacity = s('capacity').trim();
    const startsAt = s('startsAt');
    const ok = await run(() => adminFetch('/live', 'POST', {
      title: s('title'), description: s('description'), instructorId: s('instructorId'),
      startsAt: startsAt ? new Date(startsAt).toISOString() : '', durationMin: Number(s('durationMin')),
      capacity: capacity === '' ? null : Number(capacity), price: s('price').trim() === '' ? 0 : Number(s('price')),
    }));
    if (ok) form.reset();
  }
  const err = (k: string) => fields[k]?.[0];
  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-ink/[.08] bg-white p-5" noValidate>
        <h2 className="font-semibold">کلاس جدید</h2>
        <Input name="title" label="عنوان" error={err('title')} />
        <Textarea name="description" label="توضیح" rows={3} error={err('description')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select name="instructorId" label="مدرس" defaultValue="" error={err('instructorId')}><option value="" disabled>انتخاب کنید</option>{instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</Select>
          <Input name="startsAt" type="datetime-local" dir="ltr" label="زمان شروع" error={err('startsAt')} />
          <Input name="durationMin" type="number" min={1} dir="ltr" label="مدت (دقیقه)" error={err('durationMin')} />
          <Input name="capacity" type="number" min={1} dir="ltr" label="ظرفیت (اختیاری)" error={err('capacity')} />
          <Input name="price" type="number" min={0} dir="ltr" label="قیمت (تومان)" defaultValue={0} error={err('price')} />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={busy}>ساخت کلاس</Button>
      </form>
      <ul className="space-y-3">{lives.map((l) => <Item key={l.id} live={l} />)}</ul>
    </div>
  );
}
