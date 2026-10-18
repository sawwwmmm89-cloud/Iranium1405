import Link from 'next/link';
import { Logo } from './logo';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink/[.06] bg-primary-soft/50">
      <div className="container grid gap-8 py-12 md:grid-cols-3">
        <div className="space-y-3">
          <Logo size={36} />
          <p className="text-sm text-ink/70">همه چی باما! یک تجربه مدرن برای یادگیری، آموزش و رشد.</p>
        </div>
        <ul className="space-y-2 text-sm">
          <li><Link href="/courses">دوره‌ها</Link></li>
          <li><Link href="/about">درباره باما</Link></li>
          <li><Link href="/contact">تماس با ما</Link></li>
        </ul>
        <p className="text-sm text-ink/60">© {new Date().getFullYear().toLocaleString('fa-IR', { useGrouping: false })} باما. تمامی حقوق محفوظ است.</p>
      </div>
    </footer>
  );
}
