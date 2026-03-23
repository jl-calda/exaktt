// src/components/ui/Select.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'

interface SelectOption {
  value: string
  label: string
  group?: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:    string
  error?:    string
  options?:  SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label, error, options = [], placeholder, className, children, ...props
}, ref) => {
  // Group options if any have a group property
  const hasGroups = options.some(o => o.group)
  const groups    = hasGroups
    ? [...new Set(options.map(o => o.group ?? 'Other'))]
    : null

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="label">{label}</label>}
      <select
        ref={ref}
        className={clsx(
          'input appearance-none cursor-pointer',
          error && 'border-red-400',
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children ?? (
          groups
            ? groups.map(g => (
                <optgroup key={g} label={g ?? ''}>
                  {options.filter(o => (o.group ?? 'Other') === g).map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
              ))
            : options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))
        )}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
})
Select.displayName = 'Select'
