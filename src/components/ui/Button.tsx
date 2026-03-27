// src/components/ui/Button.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost' | 'success'
type Size    = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  icon?:     React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary:   'bg-primary text-white hover:bg-primary-800 active:scale-[0.97] shadow-sm hover:shadow-md',
  secondary: 'border border-surface-300 bg-surface-50 text-ink-muted hover:bg-surface-100 hover:text-ink active:scale-[0.97] shadow-xs',
  ghost:     'text-ink-muted hover:bg-surface-100 hover:text-ink active:scale-[0.97]',
  danger:    'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 active:scale-[0.97]',
  'danger-ghost': 'text-ink-faint hover:text-red-600 hover:bg-red-50 active:scale-[0.97]',
  success:   'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 active:scale-[0.97]',
}

const sizes: Record<Size, string> = {
  xs: 'h-7  px-2.5 text-[10px] gap-1   rounded-lg',
  sm: 'h-8  px-3.5 text-xs     gap-1.5 rounded-lg',
  md: 'h-10 px-4   text-sm     gap-2   rounded-[10px]',
  lg: 'h-12 px-6   text-base   gap-2   rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'secondary', size = 'md', loading, icon, iconRight,
  fullWidth, className, children, disabled, ...props
}, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={clsx(
      'inline-flex items-center justify-center font-semibold transition-all duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      className,
    )}
    {...props}
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
    {children}
    {!loading && iconRight}
  </button>
))
Button.displayName = 'Button'
