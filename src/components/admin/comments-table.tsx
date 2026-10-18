'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/admin-fetch';
import { useAction } from './use-action';

export interface CommentRow { id: string; body: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; author: string; postTitle: string }

function Row({ c }: { c: CommentRow }) {
  const { busy, error, run } = useAction();
  const set = (status: CommentRow['status']) => run(() => adminFetch(`/blog/comments/${c.id}`, 'PATCH', { status }));
  return (
    <li className="space-y-2 rounded-xl border border-ink/[.08] bg-white p-4 text-sm">
      <div className="flex items-center justify-between gap-2"><span className="font-semibold">{c.author} — {c.postTitle}</span><Badge tone={c.status === 'APPROVED' ? 'blue' : c.status === 'PENDING' ? 'orange' : 'neutral'}>{c.status}</Badge></div>
      <p className="whitespace-pre-wrap">{c.body}</p>
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || c.status === 'APPROVED'} onClick={() => set('APPROVED')}>تأیید</Button>
        <Button size="sm" variant="outline" disabled={busy || c.status === 'REJECTED'} onClick={() => set('REJECTED')}>رد</Button>
        <Button size="sm" variant="ghost" className="text-red-600" disabled={busy} onClick={() => { if (window.confirm('این نظر حذف شود؟')) void run(() => adminFetch(`/blog/comments/${c.id}`, 'DELETE')); }}>حذف</Button>
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </li>
  );
}

export const CommentsTable = ({ comments }: { comments: CommentRow[] }) => <ul className="space-y-3">{comments.map((c) => <Row key={c.id} c={c} />)}</ul>;
