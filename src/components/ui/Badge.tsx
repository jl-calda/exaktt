// src/components/ui/Badge.tsx
import { clsx } from 'clsx'
export function Badge({ children, color, className }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <span
      style={color ? { color } : undefined}
      className={clsx('badge border', color ? 'bg-surface-100 border-surface-200/60' : 'bg-surface-100 text-ink-muted border-surface-300', className)}>
      {children}
    </span>
  )
}
