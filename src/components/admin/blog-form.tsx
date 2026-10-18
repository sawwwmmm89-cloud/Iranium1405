'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { adminFetch } from '@/lib/admin-fetch';
import { useAction } from './use-action';

export interface PostValues { title: string; excerpt: string; content: string; coverImageUrl: string | null; categoryName: string | null; seoTitle: string | null; seoDescription: string | null }
const orNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());

export function BlogForm({ postId, initial, status }: { postId?: string; initial?: PostValues; status?: 'DRAFT' | 'PUBLISHED' }) {
  const router = useRouter();
  const { busy, error, fields, run } = useAction();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? '');
    const payload = { title: s('title'), excerpt: s('excerpt'), content: s('content'), coverImageUrl: orNull(s('coverImageUrl')), categoryName: orNull(s('categoryName')), seoTitle: orNull(s('seoTitle')), seoDescription: orNull(s('seoDescription')) };
    if (postId) await run(() => adminFetch(`/blog/posts/${postId}`, 'PATCH', payload));
    else await run(() => adminFetch<{ id: string }>('/blog/posts', 'POST', payload), (p) => router.push(`/admin/blog/${p.id}`));
  }
  const err = (k: string) => fields[k]?.[0];
  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input name="title" label="عنوان" defaultValue={initial?.title} error={err('title')} />
        <Textarea name="excerpt" label="خلاصه" rows={2} defaultValue={initial?.excerpt} error={err('excerpt')} />
        <Textarea name="content" label="متن (Markdown ساده: ## عنوان، - فهرست، **پررنگ**، [متن](https://...))" rows={14} defaultValue={initial?.content} error={err('content')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="coverImageUrl" dir="ltr" label="آدرس تصویر شاخص" defaultValue={initial?.coverImageUrl ?? ''} error={err('coverImageUrl')} />
          <Input name="categoryName" label="دسته‌بندی" defaultValue={initial?.categoryName ?? ''} error={err('categoryName')} />
          <Input name="seoTitle" label="عنوان سئو" defaultValue={initial?.seoTitle ?? ''} error={err('seoTitle')} />
          <Input name="seoDescription" label="توضیح سئو" defaultValue={initial?.seoDescription ?? ''} error={err('seoDescription')} />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={busy}>{postId ? 'ذخیره' : 'ساخت مقاله (پیش‌نویس)'}</Button>
      </form>
      {postId && (
        <div className="flex gap-2">
          {status === 'DRAFT' ? <Button variant="accent" onClick={() => run(() => adminFetch(`/blog/posts/${postId}/publish`, 'POST'))}>انتشار</Button> : <Button variant="outline" onClick={() => run(() => adminFetch(`/blog/posts/${postId}/unpublish`, 'POST'))}>لغو انتشار</Button>}
          <Button variant="ghost" className="text-red-600" onClick={() => { if (window.confirm('این مقاله حذف شود؟')) void run(() => adminFetch(`/blog/posts/${postId}`, 'DELETE'), () => router.push('/admin/blog')); }}>حذف</Button>
        </div>
      )}
    </div>
  );
}
