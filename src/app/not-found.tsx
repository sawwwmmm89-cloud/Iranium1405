import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold">صفحه پیدا نشد</h1>
      <p className="text-ink/70">آدرس واردشده وجود ندارد یا جابه‌جا شده است.</p>
      <Link href="/" className={buttonStyles()}>بازگشت به خانه</Link>
    </div>
  );
}
