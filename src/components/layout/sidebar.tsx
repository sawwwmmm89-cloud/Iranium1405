import Link from 'next/link';
import { Logo } from './logo';

export interface NavItem { href: string; label: string }

export function Sidebar({ items, title }: { items: NavItem[]; title: string }) {
  return (
    <>
      <aside className="hidden w-64 shrink-0 border-e border-ink/[.06] bg-white p-4 lg:block">
        <Logo size={36} />
        <p className="mb-3 mt-6 text-xs font-medium text-ink/50">{title}</p>
        <nav className="flex flex-col gap-1">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="rounded-lg px-3 py-2 text-sm hover:bg-primary-soft">{i.label}</Link>
          ))}
        </nav>
      </aside>
      <nav aria-label={title} className="flex gap-2 overflow-x-auto border-b border-ink/[.06] bg-white p-2 lg:hidden">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm hover:bg-primary-soft">{i.label}</Link>
        ))}
      </nav>
    </>
  );
}
