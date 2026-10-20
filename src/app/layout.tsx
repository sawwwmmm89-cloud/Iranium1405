import type { Metadata } from 'next';
import '@fontsource-variable/vazirmatn';
import './globals.css';

const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const metadataBase = (() => {
  if (!configuredAppUrl) return new URL('http://localhost:3000');
  try {
    return new URL(configuredAppUrl.includes('://') ? configuredAppUrl : `https://${configuredAppUrl}`);
  } catch {
    return new URL('http://localhost:3000');
  }
})();

export const metadata: Metadata = {
  metadataBase,
  title: { default: 'باما | همه چی باما!', template: '%s | باما' },
  description: 'یک تجربه مدرن برای یادگیری، آموزش و رشد.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">پرش به محتوای اصلی</a>
        {children}
      </body>
    </html>
  );
}
