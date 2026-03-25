// src/components/logistics/ManufacturersTab.tsx
'use client'
import { useState } from 'react'
import { Plus, Edit3, Trash2, Check, X, Globe, MapPin, Mail, Phone, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'

interface Props {
  manufacturers: any[]
  library:       any[]
  onRefresh:     () => void
}

export const BLANK_MFR = { name: '', contactPerson: '', email: '', phone: '', country: '', website: '', notes: '' }

export function ManufacturerModal({ open, onClose, editing, onSaved, zIndex }: {
  open:     boolean
  onClose:  () => void
  editing?: any | null
  onSaved:  () => void
  zIndex?:  number
}) {
  const [form,    setForm]    = useState({ ...BLANK_MFR, ...(editing ? {
    name: editing.name, contactPerson: editing.contactPerson ?? '', email: editing.email ?? '',
    phone: editing.phone ?? '', country: editing.country ?? '', website: editing.website ?? '', notes: editing.notes ?? '',
  } : {}) })
  const [loading, setLoading] = useState(false)

  // Re-sync form when editing changes
  const currentForm = form

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!currentForm.name.trim()) return
    setLoading(true)
    if (editing) {
      await fetch('/api/mto/manufacturers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...currentForm }) })
    } else {
      await fetch('/api/mto/manufacturers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentForm) })
    }
    setLoading(false)
    setForm({ ...BLANK_MFR })
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Manufacturer' : 'Add Manufacturer'} maxWidth="max-w-md" zIndex={zIndex}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Name *</label>
            <input className="input" value={currentForm.name} onChange={set('name')} placeholder="e.g. Hilti AG" autoFocus />
          </div>
          <div className="col-span-2">
            <label className="label">Contact Person</label>
            <input className="input" value={currentForm.contactPerson} onChange={set('contactPerson')} placeholder="e.g. John Tan" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={currentForm.email} onChange={set('email')} placeholder="contact@company.com" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={currentForm.phone} onChange={set('phone')} placeholder="+65 9999 9999" />
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input" value={currentForm.country} onChange={set('country')} placeholder="e.g. Germany" />
          </div>
          <div>
            <label className="label">Website</label>
            <input className="input" value={currentForm.website} onChange={set('website')} placeholder="e.g. hilti.com" />
          </div>
          <div className="col-span-2">
            <label className="label">Notes</label>
            <input className="input" value={currentForm.notes} onChange={set('notes')} placeholder="Optional" />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <Button size="sm" variant="secondary" onClick={onClose} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
          <Button size="sm" variant="success" onClick={save} disabled={!currentForm.name.trim() || loading}
            icon={<Check className="w-3.5 h-3.5" />}>
            {loading ? 'Saving…' : editing ? 'Save' : 'Add Manufacturer'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function ManufacturersTab({ manufacturers, library, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<any | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  const materialCount = (mfrId: string) => library.filter(i => i.manufacturerId === mfrId).length

  const openCreate = () => { setEditing(null); setShowModal(true) }
  const openEdit   = (m: any) => { setEditing(m); setShowModal(true) }

  const remove = async (id: string) => {
    await fetch('/api/mto/manufacturers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setDeleteId(null)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-ink-faint">{manufacturers.length} manufacturer{manufacturers.length !== 1 ? 's' : ''}</div>
        <Button size="sm" onClick={openCreate} icon={<Plus className="w-3.5 h-3.5" />}>Add Manufacturer</Button>
      </div>

      {manufacturers.length === 0 ? (
        <div className="card py-16 text-center text-sm text-ink-faint">
          No manufacturers yet — add them to track brand and origin information on your materials.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {manufacturers.map(m => {
            const count = materialCount(m.id)
            return (
              <div key={m.id} className="card p-4 group relative">
                <div className="pr-14">
                  <div className="font-semibold text-sm text-ink mb-0.5">{m.name}</div>
                  {count > 0 && (
                    <div className="text-[10px] text-emerald-600 font-medium mb-2">
                      {count} material{count !== 1 ? 's' : ''}
                    </div>
                  )}
                  <div className="space-y-1">
                    {m.contactPerson && (
                      <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                        <User className="w-3 h-3 flex-shrink-0" /> {m.contactPerson}
                      </div>
                    )}
                    {m.email && (
                      <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                        <Mail className="w-3 h-3 flex-shrink-0" /> {m.email}
                      </div>
                    )}
                    {m.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                        <Phone className="w-3 h-3 flex-shrink-0" /> {m.phone}
                      </div>
                    )}
                    {m.country && (
                      <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                        <MapPin className="w-3 h-3 flex-shrink-0" /> {m.country}
                      </div>
                    )}
                    {m.website && (
                      <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        <a href={m.website.startsWith('http') ? m.website : `https://${m.website}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="hover:text-primary hover:underline truncate">
                          {m.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    {m.notes && <div className="text-xs text-ink-faint italic mt-1 line-clamp-2">{m.notes}</div>}
                  </div>
                </div>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="xs" variant="ghost" onClick={() => openEdit(m)} icon={<Edit3 className="w-3 h-3" />} />
                  <Button size="xs" variant="danger" onClick={() => setDeleteId(m.id)} icon={<Trash2 className="w-3 h-3" />} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ManufacturerModal
        open={showModal}
        onClose={() => setShowModal(false)}
        editing={editing}
        onSaved={onRefresh}
      />
      <ConfirmModal
        open={deleteId !== null}
        title="Archive manufacturer?"
        message={`"${manufacturers.find(m => m.id === deleteId)?.name ?? ''}" will be archived. Materials linked to this manufacturer will be unlinked.`}
        confirmLabel="Archive"
        onConfirm={() => { if (deleteId) remove(deleteId) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
