import { EmptyState } from '@/components/ui/empty-state';

export function SectionPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <EmptyState title="این بخش هنوز پیاده‌سازی نشده است" description={description} />
    </div>
  );
}
