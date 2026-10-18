import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/admin/section-placeholder';

export const metadata: Metadata = { title: 'نظرات' };

export default function Page() {
  return <SectionPlaceholder title="نظرات" description="مدیریت نظرات کاربران در Phase 2 اضافه می‌شود." />;
}
