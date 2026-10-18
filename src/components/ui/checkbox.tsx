import { forwardRef, useId, type InputHTMLAttributes } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, id, ...props }, ref) => {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className="flex items-center gap-2">
      <input ref={ref} id={inputId} type="checkbox" className="size-4 accent-primary" {...props} />
      <label htmlFor={inputId} className="text-sm">{label}</label>
    </div>
  );
});
Checkbox.displayName = 'Checkbox';
