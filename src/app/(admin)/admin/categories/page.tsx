import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/admin/section-placeholder';

export const metadata: Metadata = { title: 'دسته‌بندی‌ها' };

export default function Page() {
  return <SectionPlaceholder title="دسته‌بندی‌ها" description="مدیریت دسته‌بندی‌ها در Phase 2 اضافه می‌شود." />;
}
