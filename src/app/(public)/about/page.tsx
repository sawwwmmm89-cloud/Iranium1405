import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'درباره ما' };

export default function AboutPage() {
  return (
    <div className="container max-w-3xl space-y-4 py-12">
      <h1 className="text-3xl font-bold">درباره باما</h1>
      <p className="text-ink/70">باما یک پلتفرم آموزشی مدرن برای یادگیری، آموزش و رشد است؛ با دوره‌های ضبط‌شده و کلاس‌های آنلاین در یک تجربهٔ یکپارچه.</p>
    </div>
  );
}
