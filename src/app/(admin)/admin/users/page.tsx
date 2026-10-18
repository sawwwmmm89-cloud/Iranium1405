import type { Metadata } from 'next';
import Link from 'next/link';
import { UsersTable } from '@/components/admin/users-table';
import { EmptyState } from '@/components/ui/empty-state';
import { listAdminUsers } from '@/server/modules/admin-users/admin-users.service';
import { adminUserListQuerySchema } from '@/server/modules/admin-users/user.schema';
import { ADMIN_ROLES, requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'کاربران' };
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireUser(ADMIN_ROLES);
  const query = adminUserListQuerySchema.parse(await searchParams);
  const { items, total } = await listAdminUsers(query);
  const pages = Math.max(1, Math.ceil(total / query.pageSize));
  const link = (p: number) => `/admin/users?${new URLSearchParams({ ...(query.q ? { q: query.q } : {}), ...(query.role ? { role: query.role } : {}), ...(query.status ? { status: query.status } : {}), page: String(p) })}`;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">کاربران <span className="text-base font-normal text-ink/50">({total.toLocaleString('fa-IR')})</span></h1>
      {me.role !== 'SUPER_ADMIN' && <p className="text-sm text-ink/60">فقط مدیر ارشد می‌تواند نقش یا وضعیت کاربران را تغییر دهد.</p>}
      <form className="flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={query.q} placeholder="نام یا ایمیل" aria-label="جست‌وجو" className="h-11 flex-1 rounded-lg border border-ink/15 px-3" />
        <select name="role" defaultValue={query.role ?? ''} aria-label="نقش" className="h-11 rounded-lg border border-ink/15 bg-white px-3"><option value="">همهٔ نقش‌ها</option><option value="SUPER_ADMIN">SUPER_ADMIN</option><option value="ADMIN">ADMIN</option><option value="INSTRUCTOR">INSTRUCTOR</option><option value="STUDENT">STUDENT</option></select>
        <select name="status" defaultValue={query.status ?? ''} aria-label="وضعیت" className="h-11 rounded-lg border border-ink/15 bg-white px-3"><option value="">همهٔ وضعیت‌ها</option><option value="ACTIVE">فعال</option><option value="SUSPENDED">تعلیق‌شده</option></select>
        <button className="h-11 rounded-xl border border-ink/15 px-5">فیلتر</button>
      </form>
      {items.length === 0 ? <EmptyState title="کاربری پیدا نشد" /> : (
        <UsersTable
          currentUserId={me.id}
          canManage={me.role === 'SUPER_ADMIN'}
          users={items.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, enrollments: u._count.enrollments, orders: u._count.orders }))}
        />
      )}
      {pages > 1 && (
        <nav aria-label="صفحه‌بندی" className="flex items-center justify-center gap-4 text-sm">
          {query.page > 1 && <Link href={link(query.page - 1)}>قبلی</Link>}
          <span>{query.page.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}</span>
          {query.page < pages && <Link href={link(query.page + 1)}>بعدی</Link>}
        </nav>
      )}
    </div>
  );
}
