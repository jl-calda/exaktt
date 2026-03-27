// src/app/(app)/tenders/TendersClient.tsx
'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, ChevronRight, ChevronDown, CalendarDays, Trash2, Edit3, Check, X,
  FileText, Layers, Settings as SettingsIcon, ClipboardList, Clock,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { nanoid } from 'nanoid'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { Button, Input } from '@/components/ui'
import { NumberInput } from '@/components/ui/Input'

type TenderStatus = 'DRAFT' | 'SUBMITTED' | 'WON' | 'LOST' | 'CANCELLED'

const STATUS_META: Record<TenderStatus, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Draft',     bg: '#f1f5f9', color: '#64748b' },
  SUBMITTED: { label: 'Submitted', bg: '#eff6ff', color: '#1d4ed8' },
  WON:       { label: 'Won',       bg: '#f0fdf4', color: '#16a34a' },
  LOST:      { label: 'Lost',      bg: '#fef2f2', color: '#dc2626' },
  CANCELLED: { label: 'Cancelled', bg: '#f9fafb', color: '#9ca3af' },
}

const KANBAN_COLUMNS: TenderStatus[] = ['DRAFT', 'SUBMITTED', 'WON', 'LOST']
const ALL_STATUSES: TenderStatus[] = ['DRAFT', 'SUBMITTED', 'WON', 'LOST', 'CANCELLED']

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
  initialBlocks?: TenderBlock[]
  initialReportDefaults?: any
  initialPredefinedItemsLibrary?: any[]
  initialReports?: any[]
}

export default function TendersClient({
  initialTenders,
  initialBlocks = [],
  initialReportDefaults,
  initialPredefinedItemsLibrary,
  initialReports,
}: Props) {
  const router = useRouter()
  const { canWrite } = usePermissions()

  /* ── Page tab ─────────────────────────────────────────────── */
  type PageTab = 'overview' | 'quotations' | 'settings'
  const [pageTab, setPageTab] = useState<PageTab>('overview')

  /* ── Quotations filter ──────────────────────────────────── */
  const [qFilter, setQFilter] = useState<string | null>(null)

  /* ── Settings sub-sections collapsed state ─────────────────── */
  const [settingsCollapsed, setSettingsCollapsed] = useState<Set<string>>(new Set())
  const toggleSettings = (key: string) =>
    setSettingsCollapsed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  /* ── Tenders state ──────────────────────────────────────────── */
  const [tenders,  setTenders]  = useState(initialTenders)
  const [creating, setCreating] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [newName,  setNewName]  = useState('')
  const [newRef,   setNewRef]   = useState('')
  const [newDate,  setNewDate]  = useState('')

  /* ── Reports state ─────────────────────────────────────────── */
  const [allReports] = useState(initialReports ?? [])
  const [calMonth, setCalMonth] = useState(new Date())

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const year = calMonth.getFullYear(), month = calMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7 // Monday start
    const days: Date[] = []
    for (let i = -startOffset; i <= lastDay.getDate() + (6 - (lastDay.getDay() + 6) % 7) - 1; i++) {
      days.push(new Date(year, month, i + 1))
    }
    return days
  }, [calMonth])

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  const expiryDates = useMemo(() => {
    const now = new Date()
    return allReports
      .filter(r => r.validUntil)
      .map(r => {
        const d = new Date(r.validUntil)
        const daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86400000)
        return { ...r, date: d, daysLeft, color: daysLeft <= 0 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-amber-500' : 'bg-emerald-500' }
      })
  }, [allReports])

  const upcomingExpiry = useMemo(() => {
    return expiryDates.filter(d => d.daysLeft > 0 && d.daysLeft <= 30).sort((a, b) => a.daysLeft - b.daysLeft)
  }, [expiryDates])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setLoading(true)
    const res = await fetch('/api/tenders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:           newName.trim(),
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
    setNewName(''); setNewRef(''); setNewDate('')
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

  /* ── Report Defaults state ──────────────────────────────────── */
  const [reportDefaults, setReportDefaults] = useState<any>(initialReportDefaults ?? {})
  const [savingDefaults, setSavingDefaults] = useState(false)

  const saveReportDefaults = async () => {
    setSavingDefaults(true)
    await fetch('/api/tenders/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportDefaults }),
    })
    setSavingDefaults(false)
  }

  /* ── Predefined Items Library state ─────────────────────────── */
  const [libraryItems, setLibraryItems] = useState<any[]>(initialPredefinedItemsLibrary ?? [])
  const [savingLibrary, setSavingLibrary] = useState(false)

  const addLibraryItem = () => {
    setLibraryItems(prev => [...prev, { id: nanoid(), description: '', amount: 0 }])
  }

  const updateLibraryItem = (id: string, patch: any) => {
    setLibraryItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  const removeLibraryItem = (id: string) => {
    setLibraryItems(prev => prev.filter(item => item.id !== id))
  }

  const saveLibraryItems = async () => {
    setSavingLibrary(true)
    await fetch('/api/tenders/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predefinedItemsLibrary: libraryItems }),
    })
    setSavingLibrary(false)
  }

  return (
    <div className="min-h-full">
      <main className="px-4 py-4 md:px-6 md:py-5">

        {/* Page-level tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {([
                { id: 'overview' as PageTab, label: 'Overview', Icon: Layers },
                { id: 'quotations' as PageTab, label: 'Quotations', Icon: ClipboardList },
                { id: 'settings' as PageTab, label: 'Settings', Icon: SettingsIcon },
              ]).map(t => (
                <button key={t.id} onClick={() => setPageTab(t.id)}
                  className={`tab-pill ${pageTab === t.id ? 'active' : ''}`}>
                  <t.Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {pageTab === 'overview' && canWrite('tenders') && (
            <button onClick={() => setCreating(v => !v)} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> New Tender
            </button>
          )}
        </div>

        {/* ── Overview Tab ──────────────────────────────────────── */}
        {pageTab === 'overview' && (<>

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Deadlines', value: upcomingExpiry.length, Icon: CalendarDays, hero: true, sub: upcomingExpiry.length > 0 ? `${upcomingExpiry[0]?.daysLeft}d next` : 'None upcoming' },
              { label: 'Tenders', value: tenders.length, Icon: FileText, hero: false, well: 'bg-blue-100 text-blue-600', sub: `${tenders.filter(t => t.status === 'DRAFT').length} drafts` },
              { label: 'Quotations', value: allReports.length, Icon: ClipboardList, hero: false, well: 'bg-amber-100 text-amber-600', sub: `${allReports.filter(r => r.status === 'submitted').length} submitted` },
              { label: 'Won', value: tenders.filter(t => t.status === 'WON').length, Icon: Check, hero: false, well: 'bg-violet-100 text-violet-600', sub: `of ${tenders.length} total` },
            ].map(s => (
              <div key={s.label}
                className={s.hero
                  ? 'card p-4 bg-primary border-transparent'
                  : 'card p-4'}>
                <div className="flex items-center justify-between mb-2">
                  <span className={s.hero ? 'text-xs text-white/70 font-medium' : 'text-xs text-ink-faint font-medium'}>{s.label}</span>
                  <span className={s.hero
                    ? 'w-6 h-6 rounded-lg flex items-center justify-center bg-white/20 text-white'
                    : `w-6 h-6 rounded-lg flex items-center justify-center ${s.well}`}>
                    <s.Icon className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className={s.hero ? 'text-2xl font-bold text-white' : 'text-2xl font-bold text-ink'}>{s.value}</div>
                <div className={s.hero ? 'text-[11px] text-white/60 mt-0.5' : 'text-[11px] text-ink-faint mt-0.5'}>{s.sub}</div>
              </div>
            ))}
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
                    {loading ? 'Creating...' : 'Create tender'}
                  </button>
                  <button type="button" onClick={() => { setCreating(false); resetForm() }} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Kanban Board */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {KANBAN_COLUMNS.map(status => {
              const items = tenders.filter(t => t.status === status)
              const meta = STATUS_META[status]
              return (
                <div key={status} className="card p-3 min-h-[120px]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                    <span className="text-[10px] text-ink-faint">({items.length})</span>
                  </div>
                  <div className="space-y-2">
                    {items.map(t => (
                      <button key={t.id} onClick={() => router.push(`/tenders/${t.id}`)}
                        className="w-full text-left p-2.5 rounded-lg border border-surface-200 hover:border-primary/30 hover:bg-primary/5 transition-all">
                        <div className="font-medium text-xs text-ink truncate">{t.name}</div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-faint">
                          {t.reference && <span className="font-mono">{t.reference}</span>}
                          {t._count?.items > 0 && <span>{t._count.items} est.</span>}
                        </div>
                      </button>
                    ))}
                    {items.length === 0 && <div className="text-[10px] text-ink-faint text-center py-4">No tenders</div>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recent Items & Validity Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Recent Reports */}
            <div className="card overflow-hidden">
              <div className="card-header">
                <span className="text-xs font-semibold text-ink">Recent Quotations</span>
                {allReports.length > 5 && (
                  <button onClick={() => setPageTab('quotations')}
                    className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="divide-y divide-surface-200/40">
                {allReports.slice(0, 5).map(r => (
                  <button key={r.id} onClick={() => router.push(`/tenders/${r.tender?.id}/report/${r.id}`)}
                    className="w-full list-row text-left group">
                    <FileText className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink group-hover:text-primary truncate">
                        {r.reference || 'Untitled'} {r.clientName ? `— ${r.clientName}` : ''}
                      </div>
                      <div className="text-[10px] text-ink-faint">
                        {r.tender?.name} · {r.date ? format(new Date(r.date), 'dd MMM yyyy') : ''}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${r.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                  </button>
                ))}
                {allReports.length === 0 && <div className="px-4 py-6 text-center text-xs text-ink-faint">No quotations yet</div>}
              </div>
            </div>

            {/* Validity Calendar */}
            <div className="card overflow-hidden">
              <div className="card-header">
                <span className="text-xs font-semibold text-ink">Quotation Validity</span>
                <div className="flex gap-1">
                  <button onClick={() => setCalMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d })}
                    className="p-1 rounded hover:bg-surface-100 text-ink-faint">&lt;</button>
                  <span className="text-xs font-medium text-ink px-2">{format(calMonth, 'MMMM yyyy')}</span>
                  <button onClick={() => setCalMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d })}
                    className="p-1 rounded hover:bg-surface-100 text-ink-faint">&gt;</button>
                </div>
              </div>
              <div className="p-3">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                    <div key={d} className="text-[10px] text-ink-faint text-center font-medium">{d}</div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-0.5">
                  {calendarDays.map((day, i) => {
                    const isCurrentMonth = day.getMonth() === calMonth.getMonth()
                    const dots = expiryDates.filter(d => isSameDay(d.date, day))
                    const isToday = isSameDay(day, new Date())
                    return (
                      <div key={i} className={`relative h-8 flex flex-col items-center justify-center rounded text-[10px] ${
                        isCurrentMonth ? 'text-ink' : 'text-ink-faint/30'
                      } ${isToday ? 'bg-primary/10 font-bold' : ''}`}>
                        {day.getDate()}
                        {dots.length > 0 && (
                          <div className="absolute bottom-0.5 flex gap-px">
                            {dots.slice(0, 3).map((d, j) => (
                              <div key={j} className={`w-1 h-1 rounded-full ${d.color}`} />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* Upcoming expirations list */}
              <div className="border-t border-surface-200 px-4 py-2">
                <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1">Expiring soon</div>
                {upcomingExpiry.length === 0 && <div className="text-[10px] text-ink-faint">No quotations expiring within 30 days</div>}
                {upcomingExpiry.slice(0, 3).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1">
                    <span className="text-[10px] text-ink truncate">{r.reference} — {r.clientName}</span>
                    <span className={`text-[10px] font-semibold ${r.daysLeft <= 7 ? 'text-red-600' : r.daysLeft <= 14 ? 'text-amber-600' : 'text-ink-muted'}`}>
                      {r.daysLeft <= 0 ? 'Expired' : `${r.daysLeft}d left`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </>)}

        {/* ── Quotations Tab ───────────────────────────────────────── */}
        {pageTab === 'quotations' && (<>
          {/* Filter pills */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            <button onClick={() => setQFilter(null)}
              className={`filter-pill ${qFilter === null ? 'active' : ''}`}>
              All ({allReports.length})
            </button>
            {['draft', 'submitted', 'approved', 'rejected'].map(s => {
              const count = allReports.filter(r => r.status === s).length
              if (count === 0) return null
              return (
                <button key={s} onClick={() => setQFilter(f => f === s ? null : s)}
                  className={`filter-pill ${qFilter === s ? 'active' : ''}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
                </button>
              )
            })}
          </div>

          {/* Full quotations table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tender</th>
                  <th>Reference</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Valid Until</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {allReports.filter(r => !qFilter || r.status === qFilter).map(r => (
                  <tr key={r.id} className="cursor-pointer" onClick={() => router.push(`/tenders/${r.tender?.id}/report/${r.id}`)}>
                    <td className="text-xs text-ink font-medium">{r.tender?.name ?? '—'}</td>
                    <td className="text-xs text-ink-muted font-mono">{r.reference ?? '—'}</td>
                    <td className="text-xs text-ink">{r.clientName ?? '—'}</td>
                    <td>
                      <span className={`badge text-[10px] font-bold ${r.status === 'submitted' ? 'bg-blue-100 text-blue-700' : r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                    </td>
                    <td className="text-xs text-ink-muted">{r.date ? format(new Date(r.date), 'dd MMM yyyy') : '—'}</td>
                    <td className="text-xs text-ink-muted">{r.validUntil ? format(new Date(r.validUntil), 'dd MMM yyyy') : '—'}</td>
                    <td><ChevronRight className="w-3.5 h-3.5 text-ink-faint" /></td>
                  </tr>
                ))}
                {allReports.filter(r => !qFilter || r.status === qFilter).length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-ink-faint">
                    {qFilter ? `No ${qFilter} quotations` : 'No quotation reports yet. Generate one from a tender detail page.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>)}

        {/* ── Settings Tab ────────────────────────────────────────── */}
        {pageTab === 'settings' && (
          <div className="space-y-4">

            {/* 1. Blocks */}
            <div className="card overflow-hidden">
              <div className="cursor-pointer select-none card-header bg-surface-50"
                onClick={() => toggleSettings('blocks')}>
                <div className="flex items-center gap-2">
                  {settingsCollapsed.has('blocks') ? <ChevronRight className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
                  <span className="icon-well bg-surface-200/40"><Layers className="w-3.5 h-3.5 text-ink-muted" /></span>
                  <span className="font-semibold text-sm text-ink">Blocks</span>
                  {blocks.length > 0 && <span className="text-[10px] text-ink-faint">({blocks.length})</span>}
                </div>
                {!settingsCollapsed.has('blocks') && (
                  <button onClick={(e) => { e.stopPropagation(); setBlockAdding(v => !v); setBlockEditing(null) }} className="btn-primary text-xs">
                    <Plus className="w-3.5 h-3.5" /> New Block
                  </button>
                )}
              </div>

              {!settingsCollapsed.has('blocks') && (
                <div className="p-4 space-y-4">
                  {/* Add block form */}
                  {blockAdding && (
                    <div className="card p-4 border-primary/30 bg-primary/5 space-y-3 animate-fade-in">
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
                    <div className="text-center text-sm text-ink-faint py-8">
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
                                <button onClick={() => startEditBlock(b)} className="p-1.5 rounded-lg text-ink-faint hover:text-primary hover:bg-surface-100 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setBlockDeleteId(b.id)} className="p-1.5 rounded-lg text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
            </div>

            {/* 2. Report Defaults */}
            <div className="card overflow-hidden">
              <div className="cursor-pointer select-none card-header !justify-start gap-2 bg-surface-50"
                onClick={() => toggleSettings('reportDefaults')}>
                {settingsCollapsed.has('reportDefaults') ? <ChevronRight className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
                <span className="icon-well bg-surface-200/40"><FileText className="w-3.5 h-3.5 text-ink-muted" /></span>
                <span className="font-semibold text-sm text-ink">Report Defaults</span>
              </div>

              {!settingsCollapsed.has('reportDefaults') && (
                <div className="p-4 space-y-3">
                  <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide">Report Defaults</h3>
                  <div>
                    <label className="label">Default Payment Terms</label>
                    <textarea className="input resize-none" rows={2} value={reportDefaults.paymentTerms ?? ''}
                      onChange={e => setReportDefaults((d: any) => ({ ...d, paymentTerms: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Default Disclaimer</label>
                    <textarea className="input resize-none" rows={2} value={reportDefaults.disclaimer ?? ''}
                      onChange={e => setReportDefaults((d: any) => ({ ...d, disclaimer: e.target.value }))} />
                  </div>
                  <Input label="Default Validity Period" value={reportDefaults.validityPeriod ?? ''}
                    onChange={e => setReportDefaults((d: any) => ({ ...d, validityPeriod: e.target.value }))} placeholder="e.g. 30 days" />
                  <Button size="sm" variant="primary" onClick={saveReportDefaults} loading={savingDefaults}>Save Defaults</Button>
                </div>
              )}
            </div>

            {/* 3. Predefined Items Library */}
            <div className="card overflow-hidden">
              <div className="cursor-pointer select-none card-header bg-surface-50"
                onClick={() => toggleSettings('libraryItems')}>
                <div className="flex items-center gap-2">
                  {settingsCollapsed.has('libraryItems') ? <ChevronRight className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
                  <span className="icon-well bg-surface-200/40"><Layers className="w-3.5 h-3.5 text-ink-muted" /></span>
                  <span className="font-semibold text-sm text-ink">Predefined Items Library</span>
                  {libraryItems.length > 0 && <span className="text-[10px] text-ink-faint">({libraryItems.length})</span>}
                </div>
                {!settingsCollapsed.has('libraryItems') && (
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); addLibraryItem() }}>Add Item</Button>
                )}
              </div>

              {!settingsCollapsed.has('libraryItems') && (
                <div className="p-4 space-y-3">
                  <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide">Predefined Items Library</h3>
                  {libraryItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 border border-surface-200 rounded-lg">
                      <input className="input text-sm flex-1" value={item.description} placeholder="Description"
                        onChange={e => updateLibraryItem(item.id, { description: e.target.value })} />
                      <NumberInput value={item.amount} unit="$" min={0} className="w-28"
                        onChange={e => updateLibraryItem(item.id, { amount: parseFloat(e.target.value) || 0 })} />
                      <button onClick={() => removeLibraryItem(item.id)} className="p-1.5 rounded-lg text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <Button size="sm" variant="primary" onClick={saveLibraryItems} loading={savingLibrary}>Save Library</Button>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
