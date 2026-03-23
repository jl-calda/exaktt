// src/components/ui/Toggle.tsx
interface ToggleProps {
  checked:  boolean
  onChange: (v: boolean) => void
  color?:   string
  size?:    'sm' | 'md'
}
export function Toggle({ checked, onChange, color = '#7917de', size = 'md' }: ToggleProps) {
  const w = size === 'sm' ? 'w-8 h-4' : 'w-10 h-5'
  const t = size === 'sm' ? 'w-3 h-3 top-0.5' : 'w-4 h-4 top-0.5'
  return (
    <button type="button" role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{ background: checked ? color : undefined }}
      className={`relative rounded-full transition-colors ${w} ${checked ? '' : 'bg-surface-300'}`}>
      <span className={`absolute ${t} rounded-full bg-white shadow transition-all ${checked ? (size === 'sm' ? 'left-4' : 'left-5') : 'left-0.5'}`} />
    </button>
  )
}
