'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { adminFetch, readCsrfToken } from '@/lib/admin-fetch';
import { CSRF_HEADER } from '@/server/security/csrf-constants';

interface Attachment { id: string; originalName: string; mimeType: string; sizeBytes: number }
const MAX_HINT_MB = 20;

export function AttachmentsPanel({ lessonId }: { lessonId: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const res = await fetch(`/api/v1/lessons/${lessonId}/attachments`);
    const json = (await res.json().catch(() => null)) as { success?: boolean; data?: Attachment[]; error?: { message: string } } | null;
    if (json?.success && json.data) setItems(json.data);
    else setError(json?.error?.message ?? 'بارگذاری فهرست فایل‌ها ناموفق بود.');
  }, [lessonId]);

  useEffect(() => { void load(); }, [load]);

  async function upload(file: File) {
    setBusy(true);
    setError(undefined);
    const body = new FormData();
    body.append('file', file);
    const token = readCsrfToken();
    const res = await fetch(`/api/v1/admin/lessons/${lessonId}/attachments`, { method: 'POST', body, headers: token ? { [CSRF_HEADER]: token } : undefined });
    const json = (await res.json().catch(() => null)) as { success?: boolean; error?: { message: string } } | null;
    setBusy(false);
    if (!json?.success) setError(json?.error?.message ?? 'آپلود ناموفق بود.');
    else await load();
  }

  async function remove(id: string) {
    if (!window.confirm('این فایل حذف شود؟')) return;
    try {
      await adminFetch(`/attachments/${id}`, 'DELETE');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حذف ناموفق بود.');
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-ink/[.08] p-3">
      <p className="text-sm font-medium">فایل‌های ضمیمه</p>
      {items.length === 0 ? <p className="text-xs text-ink/60">ضمیمه‌ای ندارد.</p> : (
        <ul className="space-y-1 text-sm">{items.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2"><span>{a.originalName} <span className="text-xs text-ink/50">({Math.ceil(a.sizeBytes / 1024).toLocaleString('fa-IR')} کیلوبایت)</span></span><Button size="sm" variant="ghost" className="text-red-600" onClick={() => void remove(a.id)}>حذف</Button></li>
        ))}</ul>
      )}
      <label className="block text-sm">
        <span className="sr-only">انتخاب فایل</span>
        <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} />
      </label>
      <p className="text-xs text-ink/50">فقط PDF، PNG، JPEG و WEBP (حداکثر حدود {MAX_HINT_MB} مگابایت؛ مقدار واقعی را MAX_UPLOAD_BYTES تعیین می‌کند).</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
