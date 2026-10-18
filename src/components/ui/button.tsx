import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-deep',
        accent: 'bg-accent text-white hover:brightness-95',
        outline: 'border border-ink/15 bg-white text-ink hover:bg-primary-soft',
        ghost: 'text-ink hover:bg-primary-soft',
      },
      size: { sm: 'h-10 px-4 text-sm', md: 'h-11 px-5', lg: 'h-12 px-7 text-lg' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button ref={ref} className={cn(button({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading ? 'لطفاً صبر کنید…' : children}
    </button>
  ),
);
Button.displayName = 'Button';
export { button as buttonStyles };
