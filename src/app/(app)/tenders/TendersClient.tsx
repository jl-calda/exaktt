// src/app/(app)/tenders/TendersClient.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, CalendarDays, Trash2, Edit3, Check, X, FileText, Layers } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { nanoid } from 'nanoid'
import ClientCombobox from '@/components/ui/ClientCombobox'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

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

const BLOCK_CATEGORIES = [
  { value: 'scope',         label: 'Scope of Work' },
  { value: 'exclusions',    label: 'Exclusions' },
  { value: 'payment_terms', label: 'Payment Terms' },
  { value: 'assumptions',   label: 'Assumptions' },
  { value: 'header',        label: 'Header' },
  { value: 'custom',        label: 'Custom' },
]

interface TenderBlock {
  id: string; name: string; category: string; blockTitle?: string; blockContent?: string
}

interface Props {
  initialTenders: any[]
  initialClients: ClientOption[]
  initialBlocks?: TenderBlock[]
}

export default function TendersClient({ initialTenders, initialClients, initialBlocks = [] }: Props) {
  const router = useRouter()

  /* ── Page tab ─────────────────────────────────────────────── */
  type PageTab = 'tenders' | 'blocks'
  const [pageTab, setPageTab] = useState<PageTab>('tenders')

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

  /* ── Blocks state ─────────────────────────────────────────── */
  const [blocks, setBlocks] = useState<TenderBlock[]>(initialBlocks)
  const [blockEditing, setBlockEditing] = useState<string | null>(null)
  const [blockForm, setBlockForm] = useState({ name: '', category: 'custom', blockTitle: '', blockContent: '' })
  const [blockAdding, setBlockAdding] = useState(false)
  const [blockSaving, setBlockSaving] = useState(false)
  const [blockDeleteId, setBlockDeleteId] = useState<string | null>(null)

  const saveBlocks = async (next: TenderBlock[]) => {
    setBlockSaving(true)
    await fetch('/api/tenders/blocks', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: next }),
    })
    setBlocks(next)
    setBlockSaving(false)
  }

  const addBlock = () => {
    if (!blockForm.name.trim()) return
    const next = [...blocks, { id: nanoid(), ...blockForm }]
    saveBlocks(next)
    setBlockForm({ name: '', category: 'custom', blockTitle: '', blockContent: '' })
    setBlockAdding(false)
  }

  const updateBlock = () => {
    if (!blockEditing || !blockForm.name.trim()) return
    const next = blocks.map(b => b.id === blockEditing ? { ...b, ...blockForm } : b)
    saveBlocks(next)
    setBlockEditing(null)
  }

  const removeBlock = (id: string) => {
    saveBlocks(blocks.filter(b => b.id !== id))
    setBlockDeleteId(null)
  }

  const startEditBlock = (b: TenderBlock) => {
    setBlockEditing(b.id)
    setBlockForm({ name: b.name, category: b.category, blockTitle: b.blockTitle ?? '', blockContent: b.blockContent ?? '' })
    setBlockAdding(false)
  }

  return (
    <div className="min-h-full">
      <main className="px-4 py-4 md:px-6 md:py-5">

        {/* Page-level tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-base text-ink">Tenders</h1>
            <div className="flex gap-1">
              {([
                { id: 'tenders' as PageTab, label: 'Tenders', Icon: FileText },
                { id: 'blocks' as PageTab, label: 'Blocks', Icon: Layers },
              ]).map(t => (
                <button key={t.id} onClick={() => setPageTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    pageTab === t.id ? 'bg-primary/10 text-primary font-semibold' : 'text-ink-muted hover:text-ink hover:bg-surface-100'
                  }`} style={{ borderRadius: 'var(--radius)' }}>
                  <t.Icon className="w-3.5 h-3.5" />
                  {t.label}
                  {t.id === 'blocks' && blocks.length > 0 && (
                    <span className="text-[10px] text-ink-faint ml-0.5">({blocks.length})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {pageTab === 'tenders' && (
            <button onClick={() => setCreating(v => !v)} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> New Tender
            </button>
          )}
          {pageTab === 'blocks' && (
            <button onClick={() => { setBlockAdding(v => !v); setBlockEditing(null) }} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> New Block
            </button>
          )}
        </div>

        {pageTab === 'tenders' && (<>
        {/* Tenders tab content */}

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
        </>)}

        {/* ── Blocks Tab ────────────────────────────────────────── */}
        {pageTab === 'blocks' && (
          <div className="space-y-4">
            {/* Add block form */}
            {blockAdding && (
              <div className="card p-4 border-primary/30 bg-primary/5 space-y-3">
                <div className="text-xs font-bold text-primary uppercase tracking-wide">New Block</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Name *</label>
                    <input className="input" value={blockForm.name} onChange={e => setBlockForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Payment Terms" autoFocus />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select className="input" value={blockForm.category} onChange={e => setBlockForm(f => ({ ...f, category: e.target.value }))}>
                      {BLOCK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Block Title (optional)</label>
                  <input className="input" value={blockForm.blockTitle} onChange={e => setBlockForm(f => ({ ...f, blockTitle: e.target.value }))} placeholder="Title shown in the PDF" />
                </div>
                <div>
                  <label className="label">Content</label>
                  <textarea className="input resize-none" rows={4} value={blockForm.blockContent}
                    onChange={e => setBlockForm(f => ({ ...f, blockContent: e.target.value }))}
                    placeholder="Block content text..." />
                </div>
                <div className="flex gap-2">
                  <button onClick={addBlock} disabled={!blockForm.name.trim() || blockSaving} className="btn-primary text-sm">
                    <Check className="w-3.5 h-3.5" /> {blockSaving ? 'Saving...' : 'Add Block'}
                  </button>
                  <button onClick={() => setBlockAdding(false)} className="btn-secondary text-sm">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Block list */}
            {blocks.length === 0 && !blockAdding && (
              <div className="card p-12 text-center text-sm text-ink-faint">
                No blocks yet. Create reusable text blocks for your quotations — scope of work, payment terms, exclusions, etc.
              </div>
            )}

            <div className="space-y-2">
              {blocks.map(b => {
                const isEd = blockEditing === b.id
                const catMeta = BLOCK_CATEGORIES.find(c => c.value === b.category)
                return (
                  <div key={b.id} className={`card p-4 ${isEd ? 'ring-2 ring-primary' : ''}`}>
                    {!isEd ? (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-ink">{b.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-surface-100 text-ink-muted">{catMeta?.label ?? b.category}</span>
                          </div>
                          {b.blockTitle && <div className="text-xs text-ink-muted mt-0.5">{b.blockTitle}</div>}
                          {b.blockContent && <div className="text-xs text-ink-faint mt-1 line-clamp-2">{b.blockContent}</div>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => startEditBlock(b)} className="p-1.5 rounded text-ink-muted hover:bg-surface-200 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setBlockDeleteId(b.id)} className="p-1.5 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="label">Name *</label><input className="input" value={blockForm.name} onChange={e => setBlockForm(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
                          <div><label className="label">Category</label><select className="input" value={blockForm.category} onChange={e => setBlockForm(f => ({ ...f, category: e.target.value }))}>{BLOCK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                        </div>
                        <div><label className="label">Block Title</label><input className="input" value={blockForm.blockTitle} onChange={e => setBlockForm(f => ({ ...f, blockTitle: e.target.value }))} /></div>
                        <div><label className="label">Content</label><textarea className="input resize-none" rows={4} value={blockForm.blockContent} onChange={e => setBlockForm(f => ({ ...f, blockContent: e.target.value }))} /></div>
                        <div className="flex gap-2">
                          <button onClick={updateBlock} disabled={!blockForm.name.trim() || blockSaving} className="btn-primary text-sm"><Check className="w-3.5 h-3.5" /> Save</button>
                          <button onClick={() => setBlockEditing(null)} className="btn-secondary text-sm"><X className="w-3.5 h-3.5" /> Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <ConfirmModal
              open={blockDeleteId !== null}
              title="Delete block?"
              message="This block will be permanently removed. Existing reports that used it will not be affected."
              onConfirm={() => { if (blockDeleteId) removeBlock(blockDeleteId) }}
              onCancel={() => setBlockDeleteId(null)}
            />
          </div>
        )}
      </main>
    </div>
  )
}
