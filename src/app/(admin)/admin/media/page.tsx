import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/admin/section-placeholder';

export const metadata: Metadata = { title: 'رسانه' };

export default function Page() {
  return <SectionPlaceholder title="رسانه" description="مدیریت فایل‌ها و رسانه در Phase 2 اضافه می‌شود." />;
}
