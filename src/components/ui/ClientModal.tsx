// src/components/ui/ClientModal.tsx
'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

export interface ClientData {
  id?:            string
  name:           string
  contactPerson:  string
  email:          string
  phone:          string
  address:        string
  notes:          string
}

interface Props {
  initial?:  Partial<ClientData>
  onSave:    (client: ClientData & { id: string }) => void
  onClose:   () => void
  title?:    string
}

const EMPTY: ClientData = { name: '', contactPerson: '', email: '', phone: '', address: '', notes: '' }

export default function ClientModal({ initial, onSave, onClose, title }: Props) {
  const [form,    setForm]    = useState<ClientData>({ ...EMPTY, ...initial })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = (field: keyof ClientData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setLoading(true)
    setError('')

    const isEdit = !!initial?.id
    const url    = isEdit ? `/api/clients/${initial!.id}` : '/api/clients'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:          form.name.trim(),
        contactPerson: form.contactPerson.trim() || null,
        email:         form.email.trim() || null,
        phone:         form.phone.trim() || null,
        address:       form.address.trim() || null,
        notes:         form.notes.trim() || null,
      }),
    })
    const { data, error: apiError } = await res.json()
    if (data) onSave(data)
    else setError(apiError ?? 'Something went wrong')
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-md">
      <div className="bg-surface-50 rounded-2xl shadow-float w-full max-w-lg mx-4 overflow-hidden animate-scale-in">
        <div className="card-header">
          <h3 className="font-display font-bold text-ink">{title ?? (initial?.id ? 'Edit client' : 'New client')}</h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-surface-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Company / client name *</label>
            <input value={form.name} onChange={set('name')} placeholder="e.g. Acme Corp"
              className="input" autoFocus required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contact person</label>
              <input value={form.contactPerson} onChange={set('contactPerson')}
                placeholder="John Smith" className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={set('phone')}
                placeholder="+65 9123 4567" className="input" />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input type="email" value={form.email} onChange={set('email')}
              placeholder="john@acme.com" className="input" />
          </div>

          <div>
            <label className="label">Address</label>
            <input value={form.address} onChange={set('address')}
              placeholder="123 Example St, Singapore 123456" className="input" />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={set('notes')}
              placeholder="Any notes about this client…"
              rows={3} className="input resize-none" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading || !form.name.trim()} className="btn-primary flex-1">
              {loading ? 'Saving…' : (initial?.id ? 'Save changes' : 'Create client')}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
