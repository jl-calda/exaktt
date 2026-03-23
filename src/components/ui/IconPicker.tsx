// src/components/ui/IconPicker.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

const GROUPS: { label: string; icons: string[] }[] = [
  {
    label: 'Construction & Structure',
    icons: ['🏗️','🏭','🚧','🏛️','🏢','🏠','🧱','🪨','⬛','🔲','⬜','🪜'],
  },
  {
    label: 'Tools & Hardware',
    icons: ['🔧','⚙️','🛠️','🔩','🪛','🔨','🪝','🧲','🔗','⛓️','🔱','⚓'],
  },
  {
    label: 'Safety & Control',
    icons: ['🦺','⚠️','🛡️','🔐','🔒','🚨','🧯','🚦','🎛️','🔀','📌','🎯'],
  },
  {
    label: 'Dimensions & Measurement',
    icons: ['📏','📐','↕️','↔️','⬆️','⬇️','↗️','↘️','🔄','📊','📈','🌡️'],
  },
  {
    label: 'Materials & Packages',
    icons: ['📦','🪣','🪤','🗂️','📋','🏷️','🔑','💡','🔭','📡','🌐','♻️'],
  },
  {
    label: 'Activities & Time',
    icons: ['🕐','🗓️','✅','⏱️','🔔','📣','👷','🧑‍🏭','🤝','📝','🗒️','💼'],
  },
]

const ALL_ICONS = GROUPS.flatMap(g => g.icons)

interface Props {
  value:    string
  onChange: (icon: string) => void
  label?:   string
}

export function IconPicker({ value, onChange, label }: Props) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const [pos,    setPos]    = useState({ top: 0, right: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) { setOpen(false); setSearch('') }
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
    setSearch('')
  }

  const filtered = search.trim() ? ALL_ICONS.filter(ic => ic.includes(search)) : null

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="label">{label}</label>}

      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className="w-12 h-10 rounded-lg border border-surface-300 bg-surface-50 hover:bg-surface-100 text-xl flex items-center justify-center transition-colors"
      >
        {value || '❓'}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div ref={popoverRef}
          className="fixed z-[9999] bg-surface-50 border border-surface-200 rounded-xl w-72 overflow-hidden"
          style={{ top: pos.top, right: pos.right, boxShadow: 'var(--shadow-float)' }}>
          <div className="px-3 pt-3 pb-2">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search emoji…"
              className="input text-xs w-full"
            />
          </div>

          <div className="overflow-y-auto max-h-64 px-3 pb-3 space-y-3">
            {filtered ? (
              <div className="flex flex-wrap gap-1">
                {filtered.length === 0
                  ? <p className="text-xs text-ink-faint py-2">No results</p>
                  : filtered.map(ic => (
                    <EmojiBtn key={ic} icon={ic} selected={value === ic}
                      onSelect={() => { onChange(ic); setOpen(false); setSearch('') }} />
                  ))}
              </div>
            ) : (
              GROUPS.map(g => (
                <div key={g.label}>
                  <div className="text-[9px] font-bold uppercase tracking-wide text-ink-faint mb-1.5">{g.label}</div>
                  <div className="flex flex-wrap gap-1">
                    {g.icons.map(ic => (
                      <EmojiBtn key={ic} icon={ic} selected={value === ic}
                        onSelect={() => { onChange(ic); setOpen(false); setSearch('') }} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function EmojiBtn({ icon, selected, onSelect }: { icon: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all hover:bg-surface-100 ${
        selected ? 'bg-primary/10 ring-2 ring-primary' : ''
      }`}
    >
      {icon}
    </button>
  )
}
