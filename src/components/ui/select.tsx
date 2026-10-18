import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, className, id, children, ...props }, ref) => {
  const auto = useId();
  const selectId = id ?? auto;
  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="text-sm font-medium">{label}</label>
      <select ref={ref} id={selectId} aria-invalid={!!error} className={cn('h-11 w-full rounded-lg border border-ink/15 bg-white px-3 focus:border-primary', error && 'border-red-500', className)} {...props}>
        {children}
      </select>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';
