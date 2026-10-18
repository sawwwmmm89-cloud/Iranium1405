import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/admin/section-placeholder';

export const metadata: Metadata = { title: 'تنظیمات' };

export default function Page() {
  return <SectionPlaceholder title="تنظیمات" description="تنظیمات سایت در Phase 7 اضافه می‌شود." />;
}
