import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { getSessionUser } from '@/server/security/session';

const items = [
  { href: '/dashboard', label: 'داشبورد' },
  { href: '/dashboard/courses', label: 'دوره‌های من' },
  { href: '/dashboard/live', label: 'کلاس‌های زنده' },
  { href: '/dashboard/orders', label: 'سفارش‌ها' },
  { href: '/dashboard/profile', label: 'پروفایل' },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/dashboard');
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar items={items} title="حساب کاربری" />
      <main className="flex-1 bg-primary-soft/40 p-4 md:p-8">{children}</main>
    </div>
  );
}
