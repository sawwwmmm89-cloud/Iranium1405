'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/admin-fetch';
import { useAction } from './use-action';

export interface UserRow {
  id: string; name: string; email: string; role: 'SUPER_ADMIN' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  status: 'ACTIVE' | 'SUSPENDED'; enrollments: number; orders: number;
}

const ROLES: UserRow['role'][] = ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'STUDENT'];

function Row({ user, canManage, isSelf }: { user: UserRow; canManage: boolean; isSelf: boolean }) {
  const { busy, error, run } = useAction();
  const disabled = busy || !canManage || isSelf;
  return (
    <tr className="border-t border-ink/[.06] align-top">
      <td className="p-3"><div className="font-medium">{user.name}</div><div dir="ltr" className="text-start text-xs text-ink/60">{user.email}</div></td>
      <td className="p-3">
        <select aria-label={`نقش ${user.name}`} value={user.role} disabled={disabled} className="h-9 rounded-lg border border-ink/15 bg-white px-2 text-sm"
          onChange={(e) => run(() => adminFetch(`/users/${user.id}/role`, 'PATCH', { role: e.target.value }))}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td className="p-3"><Badge tone={user.status === 'ACTIVE' ? 'blue' : 'orange'}>{user.status === 'ACTIVE' ? 'فعال' : 'تعلیق‌شده'}</Badge></td>
      <td className="p-3 text-sm">{user.enrollments.toLocaleString('fa-IR')} / {user.orders.toLocaleString('fa-IR')}</td>
      <td className="p-3">
        {user.status === 'ACTIVE'
          ? <Button size="sm" variant="outline" disabled={disabled} onClick={() => { if (window.confirm('این کاربر تعلیق شود؟ نشست‌های فعال او قطع می‌شود.')) void run(() => adminFetch(`/users/${user.id}/suspend`, 'POST')); }}>تعلیق</Button>
          : <Button size="sm" variant="outline" disabled={disabled} onClick={() => run(() => adminFetch(`/users/${user.id}/activate`, 'POST'))}>فعال‌سازی</Button>}
        {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}

export function UsersTable({ users, canManage, currentUserId }: { users: UserRow[]; canManage: boolean; currentUserId: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink/[.08] bg-white">
      <table className="w-full min-w-[640px] text-start text-sm">
        <thead className="bg-primary-soft/60 text-xs text-ink/60"><tr><th className="p-3 text-start">کاربر</th><th className="p-3 text-start">نقش</th><th className="p-3 text-start">وضعیت</th><th className="p-3 text-start">ثبت‌نام / سفارش</th><th className="p-3 text-start">عملیات</th></tr></thead>
        <tbody>{users.map((u) => <Row key={u.id} user={u} canManage={canManage} isSelf={u.id === currentUserId} />)}</tbody>
      </table>
    </div>
  );
}
