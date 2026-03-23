// src/components/ui/ColorPicker.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

const SWATCHES = [
  '#ef4444','#dc2626','#f97316','#ea580c','#f59e0b','#d97706',
  '#22c55e','#16a34a','#14b8a6','#0d9488','#06b6d4','#0891b2',
  '#3b82f6','#2563eb','#6366f1','#4f46e5','#8b5cf6','#7c3aed',
  '#a855f7','#9333ea','#ec4899','#db2777','#f43f5e','#e11d48',
  '#64748b','#475569','#334155','#1e293b','#7917de','#be185d',
]

interface Props {
  value:    string
  onChange: (color: string) => void
  label?:   string
}

export function ColorPicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top: 0, right: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const openPicker = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setOpen(v => !v)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="label">{label}</label>}

      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className="w-10 h-10 rounded-lg border-2 border-surface-300 hover:border-surface-400 transition-colors flex-shrink-0"
        style={{ background: value }}
      />

      {open && typeof document !== 'undefined' && createPortal(
        <div ref={popoverRef}
          className="fixed z-[9999] bg-surface-50 border border-surface-200 rounded-xl p-3 w-52"
          style={{ top: pos.top, right: pos.right, boxShadow: 'var(--shadow-float)' }}>
          <div className="flex flex-wrap gap-1.5">
            {SWATCHES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { onChange(c); setOpen(false) }}
                className="w-7 h-7 rounded-md flex-shrink-0 transition-all hover:scale-110"
                style={{
                  background:    c,
                  outline:       value === c ? `2.5px solid ${c}` : '2.5px solid transparent',
                  outlineOffset: value === c ? 3 : 0,
                  transform:     value === c ? 'scale(1.15)' : undefined,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-surface-200">
            <div className="w-4 h-4 rounded flex-shrink-0" style={{ background: value }} />
            <span className="font-mono text-[10px] text-ink-faint">{value}</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
