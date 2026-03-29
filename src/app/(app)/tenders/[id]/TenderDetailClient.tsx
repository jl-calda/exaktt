// src/app/(app)/tenders/[id]/TenderDetailClient.tsx
'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, CalendarDays, X, FileText, ChevronRight, ClipboardList } from 'lucide-react'
import { nanoid } from 'nanoid'
import { NumberInput } from '@/components/ui/Input'
import { format } from 'date-fns'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { useTaskStore } from '@/store'
import DataTable, { useTableSort, type Column, type GroupDef } from '@/components/ui/DataTable'

type TenderStatus = 'DRAFT' | 'SUBMITTED' | 'WON' | 'LOST' | 'CANCELLED'

const STATUS_META: Record<TenderStatus, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Draft',     bg: '#f1f5f9', color: '#64748b' },
  SUBMITTED: { label: 'Submitted', bg: '#eff6ff', color: '#1d4ed8' },
  WON:       { label: 'Won',       bg: '#f0fdf4', color: '#16a34a' },
  LOST:      { label: 'Lost',      bg: '#fef2f2', color: '#dc2626' },
  CANCELLED: { label: 'Cancelled', bg: '#f9fafb', color: '#9ca3af' },
}

interface Props {
  tender:  any
  allJobs: any[]
  profile?: any
  tenderReports: any[]
  clients: any[]
}

/* ── Unified row type for Estimates + Quotations table ───────────────── */
type RowKind = 'estimate' | 'quotation'
interface TableRow {
  id:       string
  kind:     RowKind
  // Estimate fields
  system?:  any
  job?:     any
  notes?:   string
  // Quotation fields
  report?:  any
}

export default function TenderDetailClient({ tender: initialTender, allJobs, profile, tenderReports, clients }: Props) {
  const router = useRouter()
  const { canWrite } = usePermissions()
  const openTaskDrawer = useTaskStore(s => s.openDrawer)

  const [tender,      setTender]      = useState(initialTender)
  const [items,       setItems]       = useState<any[]>(initialTender.items ?? [])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState('')
  const [addNotes,    setAddNotes]    = useState('')
  const [adding,      setAdding]      = useState(false)
  const [removing,    setRemoving]    = useState<string | null>(null)
  const [creating,    setCreating]    = useState(false)
  const [predefinedItems, setPredefinedItems] = useState<any[]>(initialTender.predefinedItems ?? [])
  const [groupBy, setGroupBy] = useState<string>('none')
  const currency = 'SGD'

  const addPredefinedItem = () => {
    setPredefinedItems(prev => [...prev, { id: nanoid(), description: '', amount: 0 }])
  }
  const updatePredefinedItem = (id: string, patch: any) => {
    setPredefinedItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }
  const removePredefinedItem = (id: string) => {
    setPredefinedItems(prev => prev.filter(i => i.id !== id))
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`/api/tenders/${tender.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predefinedItems }),
      })
    }, 1500)
    return () => clearTimeout(timer)
  }, [predefinedItems, tender.id])

  const meta = STATUS_META[tender.status as TenderStatus] ?? STATUS_META.DRAFT

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

  // Group jobs by system for the add modal
  const jobsBySystem: Record<string, { system: any; jobs: any[] }> = {}
  allJobs.forEach(job => {
    const sysId = job.mtoSystemId
    if (!jobsBySystem[sysId]) jobsBySystem[sysId] = { system: job.mtoSystem, jobs: [] }
    jobsBySystem[sysId].jobs.push(job)
  })

  /* ── Unified table: estimates + quotations ─────────────────────────── */
  const tableRows = useMemo<TableRow[]>(() => {
    const estimateRows: TableRow[] = items.map(item => ({
      id: item.id,
      kind: 'estimate' as const,
      system: item.system,
      job: item.job,
      notes: item.notes,
    }))
    const quotationRows: TableRow[] = tenderReports.map(r => ({
      id: r.id,
      kind: 'quotation' as const,
      report: r,
    }))
    return [...estimateRows, ...quotationRows]
  }, [items, tenderReports])

  const columns = useMemo<Column<TableRow>[]>(() => [
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      sortKey: (row) => row.kind,
      width: 'w-24',
      render: (row) => (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
          row.kind === 'estimate' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {row.kind === 'estimate' ? 'Estimate' : 'Quotation'}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      sortKey: (row) => row.kind === 'estimate'
        ? (row.system?.name ?? '')
        : (row.report?.reference || row.report?.title || ''),
      render: (row) => {
        if (row.kind === 'estimate') {
          return (
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md flex items-center justify-center text-sm flex-shrink-0 bg-surface-200/40">
                {row.system?.icon ?? '📦'}
              </span>
              <div className="min-w-0">
                <div className="font-medium text-xs text-ink truncate">{row.system?.name ?? '—'}</div>
                <div className="text-[10px] text-ink-faint truncate">{row.job?.name ?? '—'}</div>
              </div>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-2">
            <span className="icon-well bg-surface-200/40 w-6 h-6 flex items-center justify-center rounded-md">
              <FileText className="w-3 h-3 text-ink-muted" />
            </span>
            <div className="min-w-0">
              <div className="font-medium text-xs text-ink truncate">{row.report?.reference || row.report?.title}</div>
              {row.report?.clientName && <div className="text-[10px] text-ink-faint truncate">To: {row.report.clientName}</div>}
            </div>
          </div>
        )
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      sortKey: (row) => row.kind === 'quotation' ? (row.report?.status ?? '') : '',
      width: 'w-24',
      render: (row) => {
        if (row.kind === 'quotation') {
          const s = row.report?.status
          return (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
              s === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {s}
            </span>
          )
        }
        return <span className="text-[10px] text-ink-faint">—</span>
      },
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      sortKey: (row) => {
        if (row.kind === 'estimate') return row.job?.calculatedAt ? new Date(row.job.calculatedAt).getTime() : 0
        return row.report?.date ? new Date(row.report.date).getTime() : 0
      },
      render: (row) => {
        const d = row.kind === 'estimate' ? row.job?.calculatedAt : row.report?.date
        return <span className="text-xs text-ink-muted">{d ? format(new Date(d), 'dd MMM yyyy') : '—'}</span>
      },
    },
    {
      key: 'detail',
      label: 'Detail',
      render: (row) => {
        if (row.kind === 'estimate') {
          return <span className="text-xs text-ink-faint truncate">{row.notes || row.job?.createdBy?.name || '—'}</span>
        }
        return (
          <span className="text-xs text-ink-faint">
            {row.report?.revisionNo ? `Rev ${row.report.revisionNo}` : ''}
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: '',
      width: 'w-16',
      align: 'right' as const,
      render: (row) => {
        if (row.kind === 'estimate' && canWrite('tenders')) {
          return (
            <button
              onClick={(e) => { e.stopPropagation(); handleRemoveItem(row.id) }}
              disabled={removing === row.id}
              className="p-1.5 rounded-lg text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )
        }
        if (row.kind === 'quotation') {
          return <ChevronRight className="w-3.5 h-3.5 text-ink-faint" />
        }
        return null
      },
    },
  ], [canWrite, removing])

  const { sorted, sortKey, sortDir, onSort } = useTableSort(tableRows, columns)

  // Group definitions
  const groups = useMemo<GroupDef<TableRow>[] | undefined>(() => {
    if (groupBy === 'type') {
      return [
        { key: 'estimates', label: 'Estimates', color: '#10b981', filter: (r) => r.kind === 'estimate' },
        { key: 'quotations', label: 'Quotations', color: '#3b82f6', filter: (r) => r.kind === 'quotation' },
      ]
    }
    if (groupBy === 'product') {
      const systems = new Map<string, string>()
      items.forEach(item => {
        const name = item.system?.name ?? 'Unknown'
        const id = item.system?.id ?? 'unknown'
        systems.set(id, name)
      })
      const g: GroupDef<TableRow>[] = []
      systems.forEach((name, id) => {
        g.push({ key: `sys-${id}`, label: name, filter: (r) => r.kind === 'estimate' && r.system?.id === id })
      })
      if (tenderReports.length > 0) {
        g.push({ key: 'quotations', label: 'Quotations', color: '#3b82f6', filter: (r) => r.kind === 'quotation' })
      }
      return g
    }
    return undefined
  }, [groupBy, items, tenderReports])

  const handleRowClick = (row: TableRow) => {
    if (row.kind === 'quotation') {
      router.push(`/tenders/${tender.id}/report/${row.id}`)
    }
  }

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
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: meta.bg, color: meta.color }}>
                {meta.label}
              </span>
            </div>
            <div className="text-xs text-ink-muted flex items-center gap-3 mt-1 flex-wrap">
              {tender.reference && <span className="font-mono text-[10px] bg-surface-200 px-2 py-0.5 rounded">{tender.reference}</span>}
              {tender.submissionDate && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Due {format(new Date(tender.submissionDate), 'dd MMM yyyy')}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => openTaskDrawer(`/tenders/${tender.id}`, { createMode: true, linkedLabel: tender.name })}
            className="btn-secondary text-xs flex items-center gap-1.5 flex-shrink-0"
          >
            <ClipboardList className="w-3.5 h-3.5" /> Assign Task
          </button>
        </div>

        {/* Unified Estimates + Quotations table */}
        <DataTable<TableRow>
          items={sorted}
          getRowId={(row) => `${row.kind}-${row.id}`}
          columns={columns}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          groups={groups}
          onRowClick={handleRowClick}
          emptyIcon="📋"
          emptyTitle="No estimates or quotations yet"
          emptyMessage="Add estimates from your products, then generate a quotation."
          toolbar={
            <>
              {/* Group by dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Group</span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="input text-xs py-1 px-2 w-28"
                >
                  <option value="none">None</option>
                  <option value="type">By Type</option>
                  <option value="product">By Product</option>
                </select>
              </div>
              <div className="flex-1" />
              {/* Action buttons */}
              {canWrite('tenders') && (
                <button onClick={() => setShowAddModal(true)} className="btn-secondary text-xs flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Estimate
                </button>
              )}
              {canWrite('tenders') && (
                <button
                  onClick={() => handleGenerateQuotation()}
                  disabled={creating}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {creating ? 'Creating…' : 'New Quotation'}
                </button>
              )}
            </>
          }
        />

        {/* Predefined Items */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-xs text-ink">Predefined Items</h2>
            {canWrite('tenders') && <button onClick={addPredefinedItem} className="btn-secondary text-xs"><Plus className="w-3.5 h-3.5" /> Add Item</button>}
          </div>
          {predefinedItems.length === 0 ? (
            <div className="card p-8 text-center text-xs text-ink-faint">No predefined items. Add mobilisation, project management, or other fixed costs.</div>
          ) : (
            <div className="space-y-2">
              {predefinedItems.map((item) => (
                <div key={item.id} className="card p-3 flex items-center gap-3">
                  <input className="input text-xs flex-1" value={item.description} placeholder="Description"
                    onChange={e => updatePredefinedItem(item.id, { description: e.target.value })} />
                  <NumberInput value={item.amount} unit={currency} min={0} step="any" className="w-32"
                    onChange={e => updatePredefinedItem(item.id, { amount: parseFloat(e.target.value) || 0 })} />
                  <button onClick={() => removePredefinedItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <div className="text-[10px] text-ink-muted text-right">
                Total: <span className="font-mono font-semibold">{currency} {predefinedItems.reduce((s, i) => s + i.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add item modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface-50 rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-ink">Add Estimate</h3>
              <button onClick={() => setShowAddModal(false)} className="text-ink-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div>
                <label className="label">Select estimate</label>
                {Object.keys(jobsBySystem).length === 0 ? (
                  <p className="text-xs text-ink-muted py-3">
                    No saved estimates yet. Open a product, run a calculation, and save it first.
                  </p>
                ) : (
                  <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
                    className="input" required>
                    <option value="">— choose an estimate —</option>
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
                  placeholder="Any notes about this estimate…" className="input" />
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
