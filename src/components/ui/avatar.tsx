import { cn } from '@/lib/utils';

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('inline-flex size-10 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary-deep', className)}>
      {name.trim().charAt(0)}
    </span>
  );
}
