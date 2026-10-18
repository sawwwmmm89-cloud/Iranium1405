'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { adminFetch } from '@/lib/admin-fetch';
import { useAction } from './use-action';

export interface Option { id: string; name: string }
export interface CourseFormValues {
  title: string; shortDesc: string; description: string; thumbnail: string | null; cover: string | null;
  price: number; discountPrice: number | null; instructorId: string; categoryId: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'; durationMin: number; featured: boolean;
  seoTitle: string | null; seoDescription: string | null;
}

const EMPTY: CourseFormValues = {
  title: '', shortDesc: '', description: '', thumbnail: null, cover: null, price: 0, discountPrice: null,
  instructorId: '', categoryId: '', level: 'BEGINNER', durationMin: 0, featured: false, seoTitle: null, seoDescription: null,
};

const orNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());
const toInt = (v: string): number => (v.trim() === '' ? 0 : Number(v));

export function CourseForm({ courseId, initial, instructors, categories }: {
  courseId?: string; initial?: CourseFormValues; instructors: Option[]; categories: Option[];
}) {
  const router = useRouter();
  const { busy, error, fields, run } = useAction();
  const [saved, setSaved] = useState(false);
  const v = initial ?? EMPTY;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? '');
    const payload = {
      title: s('title'), shortDesc: s('shortDesc'), description: s('description'),
      thumbnail: orNull(s('thumbnail')), cover: orNull(s('cover')),
      price: toInt(s('price')), discountPrice: s('discountPrice').trim() === '' ? null : Number(s('discountPrice')),
      instructorId: s('instructorId'), categoryId: s('categoryId'), level: s('level'),
      durationMin: toInt(s('durationMin')), featured: f.get('featured') === 'on',
      seoTitle: orNull(s('seoTitle')), seoDescription: orNull(s('seoDescription')),
    };
    if (courseId) {
      await run(() => adminFetch(`/courses/${courseId}`, 'PATCH', payload), () => { setSaved(true); router.refresh(); });
    } else {
      await run(() => adminFetch<{ id: string }>('/courses', 'POST', payload), (c) => router.push(`/admin/courses/${c.id}`));
    }
  }

  const err = (k: string) => fields[k]?.[0];
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Input name="title" label="عنوان" defaultValue={v.title} error={err('title')} required />
      <Textarea name="shortDesc" label="توضیح کوتاه" defaultValue={v.shortDesc} error={err('shortDesc')} rows={2} />
      <Textarea name="description" label="توضیح کامل" defaultValue={v.description} error={err('description')} rows={6} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select name="instructorId" label="مدرس" defaultValue={v.instructorId} error={err('instructorId')}>
          <option value="" disabled>انتخاب کنید</option>
          {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </Select>
        <Select name="categoryId" label="دسته‌بندی" defaultValue={v.categoryId} error={err('categoryId')}>
          <option value="" disabled>انتخاب کنید</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input name="price" type="number" min={0} dir="ltr" label="قیمت (تومان)" defaultValue={v.price} error={err('price')} />
        <Input name="discountPrice" type="number" min={0} dir="ltr" label="قیمت با تخفیف" defaultValue={v.discountPrice ?? ''} error={err('discountPrice')} />
        <Select name="level" label="سطح" defaultValue={v.level}>
          <option value="BEGINNER">مقدماتی</option><option value="INTERMEDIATE">متوسط</option><option value="ADVANCED">پیشرفته</option>
        </Select>
        <Input name="durationMin" type="number" min={0} dir="ltr" label="مدت (دقیقه)" defaultValue={v.durationMin} error={err('durationMin')} />
        <Input name="thumbnail" type="url" dir="ltr" label="آدرس تصویر بندانگشتی" defaultValue={v.thumbnail ?? ''} error={err('thumbnail')} />
        <Input name="cover" type="url" dir="ltr" label="آدرس تصویر کاور" defaultValue={v.cover ?? ''} error={err('cover')} />
        <Input name="seoTitle" label="عنوان سئو" defaultValue={v.seoTitle ?? ''} error={err('seoTitle')} />
        <Input name="seoDescription" label="توضیح سئو" defaultValue={v.seoDescription ?? ''} error={err('seoDescription')} />
      </div>
      <Checkbox name="featured" label="دورهٔ ویژه" defaultChecked={v.featured} />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {saved && <p role="status" className="text-sm text-green-700">ذخیره شد.</p>}
      <Button type="submit" loading={busy}>{courseId ? 'ذخیرهٔ تغییرات' : 'ساخت دوره (پیش‌نویس)'}</Button>
    </form>
  );
}
