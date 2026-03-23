// src/app/(app)/tenders/TendersClient.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, CalendarDays } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import ClientCombobox from '@/components/ui/ClientCombobox'

type TenderStatus = 'DRAFT' | 'SUBMITTED' | 'WON' | 'LOST' | 'CANCELLED'

const STATUS_META: Record<TenderStatus, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Draft',     bg: '#f1f5f9', color: '#64748b' },
  SUBMITTED: { label: 'Submitted', bg: '#eff6ff', color: '#1d4ed8' },
  WON:       { label: 'Won',       bg: '#f0fdf4', color: '#16a34a' },
  LOST:      { label: 'Lost',      bg: '#fef2f2', color: '#dc2626' },
  CANCELLED: { label: 'Cancelled', bg: '#f9fafb', color: '#9ca3af' },
}

const FILTER_TABS: Array<{ id: TenderStatus | 'all'; label: string }> = [
  { id: 'all',       label: 'All' },
  { id: 'DRAFT',     label: 'Draft' },
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'WON',       label: 'Won' },
  { id: 'LOST',      label: 'Lost' },
]

interface ClientOption {
  id: string; name: string; contactPerson?: string | null; email?: string | null; phone?: string | null
}

interface Props {
  initialTenders: any[]
  initialClients: ClientOption[]
}

export default function TendersClient({ initialTenders, initialClients }: Props) {
  const router = useRouter()

  const [tenders,     setTenders]     = useState(initialTenders)
  const [clients,     setClients]     = useState<ClientOption[]>(initialClients)
  const [filter,      setFilter]      = useState<TenderStatus | 'all'>('all')
  const [creating,    setCreating]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [newName,     setNewName]     = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [newClientId,   setNewClientId]   = useState<string | null>(null)
  const [newRef,      setNewRef]      = useState('')
  const [newDate,     setNewDate]     = useState('')

  const filtered = filter === 'all' ? tenders : tenders.filter(t => t.status === filter)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setLoading(true)
    const res = await fetch('/api/tenders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:           newName.trim(),
        clientId:       newClientId,
        clientName:     newClientName.trim() || undefined,
        reference:      newRef.trim() || undefined,
        submissionDate: newDate || undefined,
      }),
    })
    const { data, error } = await res.json()
    if (data)  { setTenders(t => [data, ...t]); setCreating(false); resetForm() }
    if (error) alert(error)
    setLoading(false)
  }

  const resetForm = () => {
    setNewName(''); setNewClientName(''); setNewClientId(null); setNewRef(''); setNewDate('')
  }

  return (
    <div className="min-h-full">
      <main className="px-6 py-5">

        <div className="flex items-center justify-between mb-4">
          <h1 className="font-semibold text-base text-ink">Tenders</h1>
          <button onClick={() => setCreating(v => !v)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> New Tender
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div className="card p-5 mb-4 animate-fade-in">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Tender name *</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder='e.g. "City Hall Renovation — Tender 2024"'
                    className="input" autoFocus required />
                </div>
                <div>
                  <label className="label">Client</label>
                  <ClientCombobox
                    clients={clients}
                    value={newClientName}
                    clientId={newClientId}
                    onChange={(name, id) => { setNewClientName(name); setNewClientId(id) }}
                    onNewClient={c => setClients(prev => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))}
                    placeholder="Client name"
                  />
                </div>
                <div>
                  <label className="label">Reference / RFQ No.</label>
                  <input value={newRef} onChange={e => setNewRef(e.target.value)}
                    placeholder="T-2024-001" className="input" />
                </div>
                <div>
                  <label className="label">Submission date</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                    className="input" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading || !newName.trim()} className="btn-primary">
                  {loading ? 'Creating…' : 'Create tender'}
                </button>
                <button type="button" onClick={() => { setCreating(false); resetForm() }} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-0.5 mb-4 bg-surface-100 border border-surface-200 p-0.5 rounded-lg w-fit">
          {FILTER_TABS.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                filter === t.id
                  ? 'bg-surface-50 text-ink shadow-card'
                  : 'text-ink-faint hover:text-ink-muted'
              }`}>
              {t.label}
              <span className="ml-1.5 text-[10px] text-ink-faint">
                {t.id === 'all' ? tenders.length : tenders.filter(x => x.status === t.id).length}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="font-semibold text-sm text-ink mb-1.5">
              {filter === 'all' ? 'No tenders yet' : `No ${filter.toLowerCase()} tenders`}
            </h2>
            <p className="text-sm text-ink-muted mb-6 max-w-sm mx-auto">
              {filter === 'all'
                ? 'Create a tender to start aggregating product calculations for a bid.'
                : 'No tenders match this filter.'}
            </p>
            {filter === 'all' && (
              <button onClick={() => setCreating(true)} className="btn-primary mx-auto">
                <Plus className="w-4 h-4" /> Create first tender
              </button>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden divide-y divide-surface-200">
            {filtered.map(tender => {
              const meta        = STATUS_META[tender.status as TenderStatus] ?? STATUS_META.DRAFT
              const displayName = tender.client?.name ?? tender.clientName
              return (
                <button key={tender.id}
                  onClick={() => router.push('/tenders/' + tender.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors text-left group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-ink group-hover:text-primary transition-colors truncate">
                        {tender.name}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-xs text-ink-faint flex items-center gap-3">
                      {displayName && <span>{displayName}</span>}
                      {tender.reference && <span className="font-mono">{tender.reference}</span>}
                      {tender.submissionDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {format(new Date(tender.submissionDate), 'dd MMM yyyy')}
                        </span>
                      )}
                      <span>{tender._count?.items ?? 0} item{(tender._count?.items ?? 0) !== 1 ? 's' : ''}</span>
                      <span>· Updated {formatDistanceToNow(new Date(tender.updatedAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-primary transition-colors flex-shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
