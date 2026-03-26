// src/app/(app)/tenders/[id]/TenderDetailClient.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, CalendarDays, X, FileText } from 'lucide-react'
import { format } from 'date-fns'

type TenderStatus = 'DRAFT' | 'SUBMITTED' | 'WON' | 'LOST' | 'CANCELLED'

const STATUS_META: Record<TenderStatus, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Draft',     bg: '#f1f5f9', color: '#64748b' },
  SUBMITTED: { label: 'Submitted', bg: '#eff6ff', color: '#1d4ed8' },
  WON:       { label: 'Won',       bg: '#f0fdf4', color: '#16a34a' },
  LOST:      { label: 'Lost',      bg: '#fef2f2', color: '#dc2626' },
  CANCELLED: { label: 'Cancelled', bg: '#f9fafb', color: '#9ca3af' },
}

const STATUS_TRANSITIONS: Record<TenderStatus, TenderStatus[]> = {
  DRAFT:     ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['WON', 'LOST', 'DRAFT'],
  WON:       ['DRAFT'],
  LOST:      ['DRAFT'],
  CANCELLED: ['DRAFT'],
}

interface Props {
  tender:  any
  allJobs: any[]  // all MtoJobs for the user
  profile?: any
}

export default function TenderDetailClient({ tender: initialTender, allJobs, profile }: Props) {
  const router = useRouter()

  const [tender,      setTender]      = useState(initialTender)
  const [items,       setItems]       = useState<any[]>(initialTender.items ?? [])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState('')
  const [addNotes,    setAddNotes]    = useState('')
  const [adding,      setAdding]      = useState(false)
  const [removing,    setRemoving]    = useState<string | null>(null)
  const [creating,    setCreating]    = useState(false)

  const meta = STATUS_META[tender.status as TenderStatus] ?? STATUS_META.DRAFT

  const handleStatusChange = async (newStatus: TenderStatus) => {
    const res = await fetch('/api/tenders/' + tender.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const { data } = await res.json()
    if (data) setTender((t: any) => ({ ...t, status: newStatus }))
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob) return
    setAdding(true)
    const job = allJobs.find(j => j.id === selectedJob)
    const res = await fetch(`/api/tenders/${tender.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId:    selectedJob,
        systemId: job?.mtoSystemId,
        notes:    addNotes.trim() || undefined,
        sortOrder: items.length,
      }),
    })
    const { data, error } = await res.json()
    if (data) {
      // Enrich the item with job/system info for display
      const enriched = {
        ...data,
        job:    allJobs.find(j => j.id === selectedJob),
        system: allJobs.find(j => j.id === selectedJob)?.mtoSystem,
      }
      setItems(i => [...i, enriched])
      setShowAddModal(false)
      setSelectedJob('')
      setAddNotes('')
    }
    if (error) alert(error)
    setAdding(false)
  }

  const handleRemoveItem = async (itemId: string) => {
    setRemoving(itemId)
    await fetch(`/api/tenders/${tender.id}/items/${itemId}`, { method: 'DELETE' })
    setItems(i => i.filter(x => x.id !== itemId))
    setRemoving(null)
  }

  const handleGenerateQuotation = async () => {
    setCreating(true)
    try {
      const res = await fetch(`/api/tenders/${tender.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const { data } = await res.json()
      if (data?.id) {
        router.push(`/tenders/${tender.id}/report/${data.id}`)
      }
    } finally {
      setCreating(false)
    }
  }

  const transitions = STATUS_TRANSITIONS[tender.status as TenderStatus] ?? []

  // Group jobs by system for the add modal
  const jobsBySystem: Record<string, { system: any; jobs: any[] }> = {}
  allJobs.forEach(job => {
    const sysId = job.mtoSystemId
    if (!jobsBySystem[sysId]) jobsBySystem[sysId] = { system: job.mtoSystem, jobs: [] }
    jobsBySystem[sysId].jobs.push(job)
  })

  return (
    <div className="min-h-full">
      <main className="px-4 py-4 md:px-6 md:py-5">

        {/* Back + header */}
        <div className="flex items-start gap-3 mb-6">
          <button onClick={() => router.push('/tenders')}
            className="mt-1 text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-surface-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-semibold text-base text-ink truncate">{tender.name}</h1>
              <span className="text-sm font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: meta.bg, color: meta.color }}>
                {meta.label}
              </span>
            </div>
            <div className="text-sm text-ink-muted flex items-center gap-3 mt-1 flex-wrap">
              {(tender.client?.name ?? tender.clientName) && (
                <span>{tender.client?.name ?? tender.clientName}</span>
              )}
              {tender.client?.contactPerson && (
                <span className="text-ink-faint text-xs">{tender.client.contactPerson}</span>
              )}
              {tender.reference && <span className="font-mono text-xs bg-surface-200 px-2 py-0.5 rounded">{tender.reference}</span>}
              {tender.submissionDate && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Due {format(new Date(tender.submissionDate), 'dd MMM yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status actions */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {transitions.map(s => {
            const m = STATUS_META[s]
            return (
              <button key={s} onClick={() => handleStatusChange(s)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
                style={{ borderColor: m.color + '50', color: m.color, background: m.bg }}>
                Mark as {m.label}
              </button>
            )
          })}
          <button onClick={handleGenerateQuotation} disabled={creating} className="btn-primary text-xs flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            {creating ? 'Creating…' : 'Generate Quotation'}
          </button>
        </div>

        {/* Items section */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-ink">Calculation Runs</h2>
              <p className="text-xs text-ink-muted mt-0.5">Saved calculation runs linked to this tender</p>
            </div>
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Add run
            </button>
          </div>

          {items.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3">📐</div>
              <p className="text-sm text-ink-muted max-w-xs mx-auto">
                No runs linked yet. Open a product, run and save a calculation, then add it here.
              </p>
              <button onClick={() => router.push('/products')} className="btn-secondary text-sm mt-4">
                Go to Products →
              </button>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-muted">Calculation run</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-muted">Calculated</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-muted">Notes</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-surface-50'}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {item.system && (
                          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                            style={{ background: (item.system.color ?? '#7917de') + '18' }}>
                            {item.system.icon ?? '📦'}
                          </span>
                        )}
                        <span className="font-medium text-ink truncate">{item.system?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{item.job?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-ink-faint">
                      {item.job?.calculatedAt ? format(new Date(item.job.calculatedAt), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{item.notes ?? ''}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleRemoveItem(item.id)}
                        disabled={removing === item.id}
                        className="p-1 rounded text-ink-faint hover:text-red-500 transition-colors disabled:opacity-40">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Add item modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-ink">Add calculation run</h3>
              <button onClick={() => setShowAddModal(false)} className="text-ink-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div>
                <label className="label">Select calculation run</label>
                {Object.keys(jobsBySystem).length === 0 ? (
                  <p className="text-sm text-ink-muted py-3">
                    No saved calculation runs yet. Open a product, run a calculation, and save it first.
                  </p>
                ) : (
                  <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
                    className="input" required>
                    <option value="">— choose a run —</option>
                    {Object.entries(jobsBySystem).map(([, { system, jobs }]) => (
                      <optgroup key={system?.id ?? 'unknown'} label={system?.name ?? 'Unknown product'}>
                        {jobs.map(job => (
                          <option key={job.id} value={job.id}>{job.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <input value={addNotes} onChange={e => setAddNotes(e.target.value)}
                  placeholder="Any notes about this run…" className="input" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={adding || !selectedJob} className="btn-primary flex-1">
                  {adding ? 'Adding…' : 'Add to tender'}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
