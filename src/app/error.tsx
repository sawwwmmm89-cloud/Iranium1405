'use client';

import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold">مشکلی پیش آمد</h1>
      <p className="max-w-md text-ink/70">در بارگذاری این صفحه خطایی رخ داد. لطفاً دوباره تلاش کنید.</p>
      {error.digest && <p className="text-xs text-ink/50" dir="ltr">کد پیگیری: {error.digest}</p>}
      <Button onClick={reset}>تلاش دوباره</Button>
    </div>
  );
}
