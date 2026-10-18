import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button';
import { getSessionUser } from '@/server/security/session';
import { Logo } from './logo';

const links = [
  { href: '/courses', label: 'دوره‌ها' },
  { href: '/live', label: 'کلاس‌های آنلاین' },
  { href: '/blog', label: 'وبلاگ' },
  { href: '/about', label: 'درباره ما' },
  { href: '/contact', label: 'تماس با ما' },
];

export async function Navbar() {
  const user = await getSessionUser();
  return (
    <header className="sticky top-0 z-40 border-b border-ink/[.06] bg-white/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Logo size={36} />
        <nav aria-label="اصلی" className="hidden gap-6 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm hover:text-primary">{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard" className={buttonStyles({ size: 'sm' })}>داشبورد</Link>
          ) : (
            <>
              <Link href="/login" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>ورود</Link>
              <Link href="/register" className={buttonStyles({ size: 'sm' })}>ثبت‌نام</Link>
            </>
          )}
        </div>
      </div>
      <nav aria-label="موبایل" className="container flex gap-5 overflow-x-auto pb-2 md:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="whitespace-nowrap text-sm">{l.label}</Link>
        ))}
      </nav>
    </header>
  );
}
