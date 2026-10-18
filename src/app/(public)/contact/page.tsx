import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'تماس با ما' };

export default function ContactPage() {
  return (
    <div className="container max-w-3xl space-y-4 py-12">
      <h1 className="text-3xl font-bold">تماس با ما</h1>
      <EmptyState title="راه‌های ارتباطی به‌زودی اضافه می‌شود" description="اطلاعات تماس رسمی باما پس از نهایی شدن در این صفحه قرار می‌گیرد." />
    </div>
  );
}
