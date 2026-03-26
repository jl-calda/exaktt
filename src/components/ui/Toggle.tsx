// src/components/ui/Toggle.tsx
interface ToggleProps {
  checked:  boolean
  onChange: (v: boolean) => void
  color?:   string
  size?:    'sm' | 'md'
}
export function Toggle({ checked, onChange, color = '#7917de', size = 'md' }: ToggleProps) {
  const w = size === 'sm' ? 'w-9 h-5' : 'w-[44px] h-[26px]'
  const t = size === 'sm' ? 'w-[14px] h-[14px]' : 'w-[22px] h-[22px]'
  const offset = checked
    ? (size === 'sm' ? 'left-[18px]' : 'left-[20px]')
    : 'left-[2px]'
  return (
    <button type="button" role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{ background: checked ? color : undefined }}
      className={`relative rounded-full transition-colors duration-300 ${w} ${checked ? '' : 'bg-surface-300'}`}>
      <span
        className={`absolute top-1/2 -translate-y-1/2 ${t} rounded-full bg-white shadow-md transition-all duration-300 ${offset}`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      />
    </button>
  )
}
