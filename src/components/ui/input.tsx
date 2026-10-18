import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const auto = useId();
    const inputId = id ?? auto;
    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="text-sm font-medium">{label}</label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={cn(
            'h-11 w-full rounded-lg border border-ink/15 bg-white px-3 transition-colors focus:border-primary',
            error && 'border-red-500',
            className,
          )}
          {...props}
        />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
