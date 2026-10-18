import type { ReactNode } from 'react';
import { Card } from './card';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center gap-2 border-dashed p-8 text-center shadow-none">
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink/60">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}
