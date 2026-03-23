// src/app/(app)/clients/ClientsClient.tsx
'use client'
import { useState } from 'react'
import { Plus, Mail, Phone, MapPin, Pencil, Trash2, FileText } from 'lucide-react'
import ClientModal from '@/components/ui/ClientModal'
import type { ClientData } from '@/components/ui/ClientModal'

interface Client {
  id:            string
  name:          string
  contactPerson: string | null
  email:         string | null
  phone:         string | null
  address:       string | null
  notes:         string | null
  createdAt:     string
  _count:        { tenders: number }
}

interface Props { initialClients: Client[] }

export default function ClientsClient({ initialClients }: Props) {
  const [clients,   setClients]   = useState<Client[]>(initialClients)
  const [modal,     setModal]     = useState<{ open: boolean; editing: Client | null }>({ open: false, editing: null })
  const [removing,  setRemoving]  = useState<string | null>(null)

  const openCreate = () => setModal({ open: true, editing: null })
  const openEdit   = (c: Client) => setModal({ open: true, editing: c })
  const closeModal = () => setModal({ open: false, editing: null })

  const handleSave = (saved: ClientData & { id: string }) => {
    setClients(prev => {
      const exists = prev.find(c => c.id === saved.id)
      if (exists) {
        return prev.map(c => c.id === saved.id ? { ...c, ...saved } : c)
      }
      return [{ ...saved, createdAt: new Date().toISOString(), _count: { tenders: 0 } } as Client, ...prev]
        .sort((a, b) => a.name.localeCompare(b.name))
    })
    closeModal()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this client? They will no longer appear in suggestions.')) return
    setRemoving(id)
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    setClients(prev => prev.filter(c => c.id !== id))
    setRemoving(null)
  }

  return (
    <div className="min-h-full">
      <main className="px-4 py-4 md:px-6 md:py-5">

        <div className="flex items-center justify-between mb-4">
          <h1 className="font-semibold text-base text-ink">Clients</h1>
          <button onClick={openCreate} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> New Client
          </button>
        </div>

        {clients.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">🤝</div>
            <h2 className="font-semibold text-sm text-ink mb-1.5">No clients yet</h2>
            <p className="text-sm text-ink-muted mb-6 max-w-sm mx-auto">
              Add clients to reuse them across tenders and track contact information.
            </p>
            <button onClick={openCreate} className="btn-primary mx-auto">
              <Plus className="w-4 h-4" /> Add first client
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {clients.map(client => (
              <div key={client.id} className="card p-5 flex flex-col gap-3 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate">{client.name}</div>
                    {client.contactPerson && (
                      <div className="text-sm text-ink-muted mt-0.5">{client.contactPerson}</div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(client)}
                      className="p-1.5 rounded-lg text-ink-faint hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(client.id)} disabled={removing === client.id}
                      className="p-1.5 rounded-lg text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                      title="Archive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-ink-muted">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
                      <a href={`mailto:${client.email}`} className="hover:text-primary truncate">{client.email}</a>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
                      <a href={`tel:${client.phone}`} className="hover:text-primary">{client.phone}</a>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                  {client.notes && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-ink-faint flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{client.notes}</span>
                    </div>
                  )}
                </div>

                {client._count.tenders > 0 && (
                  <div className="text-[11px] text-ink-faint pt-1 border-t border-surface-100">
                    {client._count.tenders} tender{client._count.tenders !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {modal.open && (
        <ClientModal
          initial={modal.editing ? {
            id:            modal.editing.id,
            name:          modal.editing.name,
            contactPerson: modal.editing.contactPerson ?? '',
            email:         modal.editing.email ?? '',
            phone:         modal.editing.phone ?? '',
            address:       modal.editing.address ?? '',
            notes:         modal.editing.notes ?? '',
          } : undefined}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
