// src/components/calculator/panels/MaterialSearchCombobox.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { Check, Package, Plus } from 'lucide-react'
import AddMaterialModal from './AddMaterialModal'

interface Props {
  library:      any[]
  onAddFromLib: (item: any) => void
}

const CATEGORY_ICONS: Record<string, string> = {
  plates: '🔩', fasteners: '🔩', ladder: '🪜', lifeline: '🔗',
  consumables: '📦', hardware: '⚙️', other: '📦',
}

export default function MaterialSearchCombobox({ library, onAddFromLib }: Props) {
  const [query,      setQuery]      = useState('')
  const [open,       setOpen]       = useState(false)
  const [showModal,  setShowModal]  = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const filtered = library.filter(item => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      item.name?.toLowerCase().includes(q) ||
      item.productCode?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q)
    )
  }).slice(0, 20)

  const exactMatch = library.some(item => item.name?.toLowerCase() === query.toLowerCase().trim())
  const showCreate = query.trim().length > 0 && !exactMatch

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (item: any) => {
    onAddFromLib(item)
    setQuery('')
    setOpen(false)
  }

  const handleModalAddFromLib = (item: any) => {
    onAddFromLib(item)
    setQuery('')
    setShowModal(false)
    setOpen(false)
  }

  return (
    <>
      <div ref={wrapRef} className="relative">
        <div className="relative">
          <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Add material…"
            autoComplete="off"
            className="input text-xs py-1.5 pl-8 pr-3 w-52"
          />
        </div>

        {open && (filtered.length > 0 || showCreate || library.length === 0) && (
          <ul className="absolute z-50 top-full mt-1 right-0 w-72 bg-surface-50 border border-surface-200 shadow-float max-h-64 overflow-y-auto py-1"
            style={{ borderRadius: 'var(--radius-card)' }}>

            {library.length === 0 && !showCreate && (
              <li className="px-3 py-3 text-xs text-ink-faint italic">
                No library items yet. Type a name to create one.
              </li>
            )}

            {filtered.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); select(item) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-surface-100 transition-colors text-left">
                  <span className="text-sm flex-shrink-0 leading-none">
                    {CATEGORY_ICONS[item.category] ?? '📦'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink truncate">{item.name}</div>
                    <div className="text-[10px] text-ink-faint">
                      {item.unit}{item.productCode ? ` · ${item.productCode}` : ''}{item.category ? ` · ${item.category}` : ''}
                    </div>
                  </div>
                  <Check className="w-3 h-3 text-primary flex-shrink-0 opacity-0" />
                </button>
              </li>
            ))}

            {showCreate && (
              <>
                {filtered.length > 0 && <li className="border-t border-surface-200 my-1" />}
                <li>
                  <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); setShowModal(true); setOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-primary/5 text-primary transition-colors text-left">
                    <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                    Create <span className="font-semibold mx-0.5">"{query.trim()}"</span>…
                  </button>
                </li>
              </>
            )}
          </ul>
        )}
      </div>

      <AddMaterialModal
        open={showModal}
        initialName={query.trim()}
        onClose={() => setShowModal(false)}
        onAddFromLib={handleModalAddFromLib}
      />
    </>
  )
}
