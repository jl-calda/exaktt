// src/components/ui/ClientCombobox.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { Check, Plus, User } from 'lucide-react'
import ClientModal from './ClientModal'
import type { ClientData } from './ClientModal'

interface ClientOption {
  id:            string
  name:          string
  contactPerson?: string | null
  email?:         string | null
  phone?:         string | null
}

interface Props {
  clients:      ClientOption[]
  value:        string           // display name
  clientId:     string | null
  onChange:     (name: string, clientId: string | null) => void
  onNewClient?: (client: ClientOption) => void
  placeholder?: string
  disabled?:    boolean
}

export default function ClientCombobox({
  clients, value, clientId, onChange, onNewClient, placeholder = 'Client name', disabled,
}: Props) {
  const [open,       setOpen]       = useState(false)
  const [showModal,  setShowModal]  = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const filtered = value.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(value.toLowerCase()))
    : clients

  const exactMatch = clients.some(c => c.name.toLowerCase() === value.toLowerCase().trim())
  const showCreate = value.trim().length > 0 && !exactMatch

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (client: ClientOption) => {
    onChange(client.name, client.id)
    setOpen(false)
  }

  const handleModalSave = (saved: ClientData & { id: string }) => {
    onChange(saved.name, saved.id)
    onNewClient?.(saved)
    setShowModal(false)
    setOpen(false)
  }

  return (
    <>
      <div ref={wrapRef} className="relative">
        <input
          value={value}
          onChange={e => { onChange(e.target.value, null); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="input w-full"
        />

        {clientId && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
            <Check className="w-3.5 h-3.5" />
          </span>
        )}

        {open && (filtered.length > 0 || showCreate) && (
          <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface-50 border border-surface-200 rounded-xl shadow-lg max-h-56 overflow-y-auto py-1 animate-fade-in">
            {filtered.map(c => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); select(c) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-surface-50 transition-colors text-left"
                >
                  <User className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
                  <span className="flex-1 font-medium text-ink truncate">{c.name}</span>
                  {c.contactPerson && (
                    <span className="text-xs text-ink-muted truncate max-w-[120px]">{c.contactPerson}</span>
                  )}
                  {clientId === c.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </button>
              </li>
            ))}

            {showCreate && (
              <li>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); setShowModal(true) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-primary/5 text-primary transition-colors text-left"
                >
                  <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                  Add <span className="font-semibold mx-0.5">"{value.trim()}"</span> as new client…
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      {showModal && (
        <ClientModal
          initial={{ name: value.trim() }}
          onSave={handleModalSave}
          onClose={() => setShowModal(false)}
          title="New client"
        />
      )}
    </>
  )
}
