// src/components/projects/InlineEmojiPicker.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: 'Project', emojis: ['🎯', '🏗️', '📋', '🚀', '✅', '📦', '🔧', '🎛️', '🗓️', '💼'] },
  { label: 'Work', emojis: ['📝', '⚙️', '🔨', '📐', '🧪', '📊', '🔩', '🪛', '🛠️', '⛏️'] },
  { label: 'Safety', emojis: ['🦺', '⚠️', '🛡️', '🔐', '🚨', '🧯', '🚦', '🔒', '👷', '🧑‍🏭'] },
  { label: 'Materials', emojis: ['🧱', '🪨', '🪣', '🏷️', '🔑', '💡', '♻️', '🪜', '⬛', '🔲'] },
  { label: 'Transport', emojis: ['🚗', '🚛', '🏭', '🏢', '🚧', '🏠', '⚓', '📡', '🌐', '🔭'] },
  { label: 'Time', emojis: ['🕐', '⏱️', '🔔', '📣', '🤝', '🗒️', '📈', '🌡️', '🔄', '↗️'] },
]

interface Props {
  value: string
  onChange: (emoji: string) => void
  size?: 'sm' | 'md'
}

export default function InlineEmojiPicker({ value, onChange, size = 'sm' }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const openPicker = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(v => !v)
  }

  const btnSize = size === 'sm' ? 'w-6 h-6 text-sm' : 'w-8 h-8 text-base'

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className={`${btnSize} rounded-md border border-surface-200 bg-surface-50 hover:bg-surface-100 flex items-center justify-center transition-colors shrink-0`}
        title="Pick icon"
      >
        {value || '❓'}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[9999] bg-surface-50 border border-surface-200 rounded-xl w-56 overflow-hidden animate-fade-in"
          style={{ top: pos.top, left: pos.left, boxShadow: 'var(--shadow-float)' }}
        >
          <div className="overflow-y-auto max-h-48 p-2 space-y-2">
            {EMOJI_GROUPS.map(g => (
              <div key={g.label}>
                <div className="text-[9px] font-bold uppercase tracking-wide text-ink-faint mb-1">{g.label}</div>
                <div className="flex flex-wrap gap-0.5">
                  {g.emojis.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { onChange(e); setOpen(false) }}
                      className={`w-6 h-6 rounded-md text-sm flex items-center justify-center transition-all hover:bg-surface-100 ${
                        value === e ? 'bg-surface-100 ring-1 ring-primary' : ''
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
