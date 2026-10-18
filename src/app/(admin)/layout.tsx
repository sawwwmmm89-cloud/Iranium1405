import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { ADMIN_ROLES, getSessionUser } from '@/server/security/session';

const items = [
  { href: '/admin', label: 'داشبورد' },
  { href: '/admin/courses', label: 'دوره‌ها' },
  { href: '/admin/categories', label: 'دسته‌بندی‌ها' },
  { href: '/admin/instructors', label: 'مدرسان' },
  { href: '/admin/users', label: 'کاربران و دانشجویان' },
  { href: '/admin/orders', label: 'سفارش‌ها' },
  { href: '/admin/payments', label: 'پرداخت‌ها' },
  { href: '/admin/live', label: 'کلاس‌های زنده' },
  { href: '/admin/blog', label: 'وبلاگ' },
  { href: '/admin/blog/comments', label: 'نظرات وبلاگ' },
  { href: '/admin/reviews', label: 'نظرات' },
  { href: '/admin/media', label: 'رسانه' },
  { href: '/admin/settings', label: 'تنظیمات' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/admin');
  if (!ADMIN_ROLES.includes(user.role)) redirect('/dashboard');
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar items={items} title="مدیریت" />
      <main className="flex-1 bg-primary-soft/40 p-4 md:p-8">{children}</main>
    </div>
  );
}
