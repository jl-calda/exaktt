// src/components/ui/Modal.tsx
'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open:      boolean
  onClose:   () => void
  title?:    string
  children:  React.ReactNode
  maxWidth?: string
  zIndex?:   number
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg', zIndex }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={zIndex ? { zIndex } : undefined}>
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-surface-50 rounded-2xl shadow-float animate-fade-in max-h-[calc(100vh-2rem)] overflow-y-auto`}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-300">
            <h2 className="font-display font-bold text-base text-ink">{title}</h2>
            <button onClick={onClose} className="text-ink-faint hover:text-ink transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
