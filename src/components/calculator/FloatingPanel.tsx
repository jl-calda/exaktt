// src/components/calculator/FloatingPanel.tsx
// Reusable floating right-side panel (used by Field Guide, Dependency Chain, System Overview)
'use client'
import { X } from 'lucide-react'

interface Props {
  open:      boolean
  onClose:   () => void
  title:     string
  icon?:     React.ReactNode
  width?:    string       // default 'w-80'
  children:  React.ReactNode
}

export default function FloatingPanel({ open, onClose, title, icon, width = 'w-80', children }: Props) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 animate-fade-in" onClick={onClose} />
      <div className={`fixed top-0 right-0 z-50 h-full ${width} max-w-[90vw] bg-surface-50 border-l border-surface-200 shadow-float overflow-y-auto animate-slide-in-right flex flex-col`}>
        <div className="sticky top-0 z-10 bg-surface-50 border-b border-surface-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs font-bold text-ink">{title}</span>
          </div>
          <button onClick={onClose}
            className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-surface-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}
