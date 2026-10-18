import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/admin/section-placeholder';

export const metadata: Metadata = { title: 'مدرسان' };

export default function Page() {
  return <SectionPlaceholder title="مدرسان" description="مدیریت مدرسان در Phase 2 اضافه می‌شود." />;
}
