// src/components/ui/Input.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:     string
  error?:     string
  hint?:      string
  leftIcon?:  React.ReactNode
  rightIcon?: React.ReactNode
  unit?:      string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, hint, leftIcon, rightIcon, unit, className, ...props
}, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="label">{label}</label>}
    <div className="relative">
      {leftIcon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">
          {leftIcon}
        </span>
      )}
      <input
        ref={ref}
        className={clsx(
          'input',
          leftIcon  && 'pl-9',
          (rightIcon || unit) && 'pr-9',
          error  && 'border-red-400 focus:border-red-400 focus:ring-red-200',
          className,
        )}
        {...props}
      />
      {(rightIcon || unit) && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint text-xs pointer-events-none">
          {unit ?? rightIcon}
        </span>
      )}
    </div>
    {error && <p className="text-xs text-red-600">{error}</p>}
    {hint && !error && <p className="text-xs text-ink-faint">{hint}</p>}
  </div>
))
Input.displayName = 'Input'

// Compact number input used in run editors and dim forms
interface NumberInputProps extends Omit<InputProps, 'type'> {
  step?: number | string
  min?:  number
  max?:  number
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, ...props }, ref) => (
    <Input ref={ref} type="number" className={clsx('text-right font-mono', className)} {...props} />
  )
)
NumberInput.displayName = 'NumberInput'
