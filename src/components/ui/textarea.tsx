import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, className, id, ...props }, ref) => {
  const auto = useId();
  const areaId = id ?? auto;
  return (
    <div className="space-y-1.5">
      <label htmlFor={areaId} className="text-sm font-medium">{label}</label>
      <textarea ref={ref} id={areaId} aria-invalid={!!error} rows={4} className={cn('w-full rounded-lg border border-ink/15 bg-white p-3 focus:border-primary', error && 'border-red-500', className)} {...props} />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';
