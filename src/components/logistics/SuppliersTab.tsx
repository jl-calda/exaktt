// src/components/logistics/SuppliersTab.tsx
'use client'
import { useState } from 'react'
import { Plus, Edit3, Trash2, Check, X, Mail, Phone, MapPin, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'

interface Props {
  suppliers: any[]
  onRefresh: () => void
}

const BLANK = { name: '', contactPerson: '', email: '', phone: '', address: '', paymentTerms: '', notes: '' }

export default function SuppliersTab({ suppliers, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<any | null>(null)
  const [form,      setForm]      = useState({ ...BLANK })
  const [loading,   setLoading]   = useState(false)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  const openCreate = () => { setEditing(null); setForm({ ...BLANK }); setShowModal(true) }
  const openEdit   = (s: any) => {
    setEditing(s)
    setForm({ name: s.name, contactPerson: s.contactPerson ?? '', email: s.email ?? '', phone: s.phone ?? '', address: s.address ?? '', paymentTerms: s.paymentTerms ?? '', notes: s.notes ?? '' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.name.trim()) return
    setLoading(true)
    if (editing) {
      await fetch('/api/logistics/suppliers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...form }) })
    } else {
      await fetch('/api/logistics/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    }
    setLoading(false)
    setShowModal(false)
    onRefresh()
  }

  const remove = async (id: string) => {
    await fetch('/api/logistics/suppliers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setDeleteId(null)
    onRefresh()
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-ink-faint">{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}</div>
        <Button size="sm" onClick={openCreate} icon={<Plus className="w-3.5 h-3.5" />}>Add Supplier</Button>
      </div>

      {suppliers.length === 0 ? (
        <div className="card py-16 text-center text-sm text-ink-faint">
          No suppliers yet — add your first supplier to start creating purchase orders.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="card p-4 group relative">
              <div className="pr-14">
                <div className="font-semibold text-sm text-ink mb-1">{s.name}</div>
                {s.contactPerson && <div className="text-xs text-ink-muted mb-2">{s.contactPerson}</div>}
                <div className="space-y-1">
                  {s.email && (
                    <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                      <Mail className="w-3 h-3 flex-shrink-0" /> {s.email}
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                      <Phone className="w-3 h-3 flex-shrink-0" /> {s.phone}
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                      <MapPin className="w-3 h-3 flex-shrink-0" /> {s.address}
                    </div>
                  )}
                  {s.paymentTerms && (
                    <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                      <CreditCard className="w-3 h-3 flex-shrink-0" /> {s.paymentTerms}
                    </div>
                  )}
                  {s.notes && <div className="text-xs text-ink-faint italic mt-1 line-clamp-2">{s.notes}</div>}
                </div>
              </div>
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="xs" variant="ghost" onClick={() => openEdit(s)} icon={<Edit3 className="w-3 h-3" />} />
                <Button size="xs" variant="danger" onClick={() => setDeleteId(s.id)} icon={<Trash2 className="w-3 h-3" />} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Supplier' : 'Add Supplier'} maxWidth="max-w-md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Company Name *</label>
              <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. ABC Trading Pte Ltd" autoFocus />
            </div>
            <div className="col-span-2">
              <label className="label">Contact Person</label>
              <input className="input" value={form.contactPerson} onChange={set('contactPerson')} placeholder="e.g. John Tan" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="orders@abc.com" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="+65 9999 9999" />
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={set('address')} placeholder="Street, City, Country" />
            </div>
            <div>
              <label className="label">Payment Terms</label>
              <input className="input" value={form.paymentTerms} onChange={set('paymentTerms')} placeholder="e.g. Net 30" />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={set('notes')} placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="secondary" onClick={() => setShowModal(false)} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
            <Button size="sm" variant="success" onClick={save} disabled={!form.name.trim() || loading}
              icon={<Check className="w-3.5 h-3.5" />}>
              {loading ? 'Saving…' : editing ? 'Save' : 'Add Supplier'}
            </Button>
          </div>
        </div>
      </Modal>
      <ConfirmModal
        open={deleteId !== null}
        title="Archive supplier?"
        message={`"${suppliers.find(s => s.id === deleteId)?.name ?? ''}" will be archived.`}
        confirmLabel="Archive"
        onConfirm={() => { if (deleteId) remove(deleteId) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
