// src/app/(app)/tenders/TendersClient.tsx — Overview tab (kanban + stats + recent quotations + calendar)
'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, ChevronRight, CalendarDays, Check,
  FileText, Layers, ClipboardList,
} from 'lucide-react'
import { format } from 'date-fns'
import { usePermissions } from '@/lib/hooks/usePermissions'

type TenderStatus = 'DRAFT' | 'SUBMITTED' | 'WON' | 'LOST' | 'CANCELLED'

const STATUS_META: Record<TenderStatus, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Draft',     bg: '#f1f5f9', color: '#64748b' },
  SUBMITTED: { label: 'Submitted', bg: '#eff6ff', color: '#1d4ed8' },
  WON:       { label: 'Won',       bg: '#f0fdf4', color: '#16a34a' },
  LOST:      { label: 'Lost',      bg: '#fef2f2', color: '#dc2626' },
  CANCELLED: { label: 'Cancelled', bg: '#f9fafb', color: '#9ca3af' },
}

const KANBAN_COLUMNS: TenderStatus[] = ['DRAFT', 'SUBMITTED', 'WON', 'LOST']

interface Props {
  initialTenders: any[]
  initialReports?: any[]
}

export default function TendersClient({ initialTenders, initialReports }: Props) {
  const router = useRouter()
  const { canWrite } = usePermissions()

  const [tenders,  setTenders]  = useState(initialTenders)
  const [creating, setCreating] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [newName,  setNewName]  = useState('')
  const [newRef,   setNewRef]   = useState('')
  const [newDate,  setNewDate]  = useState('')

  const [allReports] = useState(initialReports ?? [])
  const [calMonth, setCalMonth] = useState(new Date())

  const calendarDays = useMemo(() => {
    const year = calMonth.getFullYear(), month = calMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7
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

  return (
    <div className="min-h-full px-4 py-4 md:px-6 md:py-5">

      {/* Header with New Tender button */}
      <div className="flex items-center justify-between mb-4">
        <div />
        {canWrite('tenders') && (
          <button onClick={() => setCreating(v => !v)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> New Tender
          </button>
        )}
      </div>

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
              <a href="/tenders/quotations"
                className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                View all <ChevronRight className="w-3 h-3" />
              </a>
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
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${r.status === 'submitted' ? 'bg-blue-100 text-blue-700' : r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
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
    </div>
  )
}
