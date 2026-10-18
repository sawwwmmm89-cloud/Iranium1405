'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiCall, ClientApiError } from '@/lib/api-client';

export function CommentForm({ slug }: { slug: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMsg(undefined);
    try {
      await apiCall(`/blog/posts/${encodeURIComponent(slug)}/comments`, 'POST', { body: String(new FormData(form).get('body') ?? '') });
      form.reset();
      setMsg({ ok: true, text: 'نظر شما ثبت شد و پس از تأیید مدیر نمایش داده می‌شود.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ClientApiError ? err.message : 'ارتباط با سرور برقرار نشد.' });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Textarea name="body" label="نظر شما" rows={3} required minLength={2} maxLength={2000} />
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
      <Button type="submit" loading={busy}>ارسال نظر</Button>
    </form>
  );
}
