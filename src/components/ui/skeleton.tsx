import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Skeleton = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div aria-hidden className={cn('animate-pulse rounded-lg bg-ink/[.06]', className)} {...props} />
);
