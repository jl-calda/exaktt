// src/components/tender/TenderReportBuilder.tsx
'use client'
import { useState, useMemo, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  Plus, Trash2, ChevronUp, ChevronDown, Download, Save,
  BookTemplate, FileText, GripVertical, DollarSign, Type,
  Briefcase, X, ArrowLeft, Lock, Unlock, Upload, ImageIcon,
  ClipboardList, StickyNote,
} from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { NumberInput } from '@/components/ui/Input'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import type {
  TenderReport,
  TenderReportSection,
  TenderReportJobLine,
  TenderReportCustomLine,
  TenderReportTextBlock,
  TenderReportImageBlock,
  TenderTemplate,
  JobLastResults,
} from '@/types'

/* ────────────────────────────────────────────────────────────────────────── */
/*  Props                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

interface Props {
  tender: any                    // Tender with items, client
  tenderItems: any[]             // TenderItem[] with system and job data
  profile?: any                  // CompanyProfile for branding defaults
  existingReport?: any           // Existing TenderReport to edit (or null for new)
  templates?: TenderTemplate[]   // Company templates
  onClose?: () => void
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function computeFinalPrice(amount: number, marginPct: number): number {
  return amount * (1 + marginPct / 100)
}

function fmtCurrency(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const SECTION_BADGES: Record<string, { label: string; color: string }> = {
  job_line:    { label: 'Job',    color: 'bg-blue-100 text-blue-700' },
  custom_line: { label: 'Custom', color: 'bg-amber-100 text-amber-700' },
  text_block:  { label: 'Text',   color: 'bg-purple-100 text-purple-700' },
  image_block: { label: 'Images', color: 'bg-green-100 text-green-700' },
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

export default function TenderReportBuilder({
  tender,
  tenderItems,
  profile,
  existingReport,
  templates = [],
  onClose,
}: Props) {

  /* ── Header state ─────────────────────────────────────────────────────── */
  const [title, setTitle]           = useState(existingReport?.title ?? 'Quotation')
  const [reference, setReference]   = useState(existingReport?.reference ?? '')
  const [date, setDate]             = useState(
    existingReport?.date ? format(new Date(existingReport.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
  )
  const [validUntil, setValidUntil] = useState(
    existingReport?.validUntil ? format(new Date(existingReport.validUntil), 'yyyy-MM-dd') : '',
  )
  const [preparedBy, setPreparedBy] = useState(existingReport?.preparedBy ?? profile?.defaultPreparedBy ?? '')
  const [revisionNo, setRevisionNo] = useState(existingReport?.revisionNo ?? '1')
  const [currency, setCurrency]     = useState(existingReport?.currency ?? profile?.defaultCurrency ?? 'SGD')

  /* ── Sections state ───────────────────────────────────────────────────── */
  const [sections, setSections] = useState<TenderReportSection[]>(existingReport?.sections ?? [])

  /* ── Footer state ─────────────────────────────────────────────────────── */
  const [paymentTerms, setPaymentTerms]     = useState(existingReport?.paymentTerms ?? '')
  const [validityPeriod, setValidityPeriod] = useState(existingReport?.validityPeriod ?? '')
  const [disclaimer, setDisclaimer]         = useState(existingReport?.disclaimer ?? profile?.defaultDisclaimer ?? '')
  const [notes, setNotes]                   = useState(existingReport?.notes ?? '')

  /* ── Cost state ───────────────────────────────────────────────────────── */
  const [overallMarginPct, setOverallMarginPct] = useState(existingReport?.overallMarginPct ?? 0)
  const [showAppendix, setShowAppendix]         = useState(existingReport?.showAppendix ?? false)

  /* ── UI state ─────────────────────────────────────────────────────────── */
  const [saving, setSaving]             = useState(false)
  const [downloading, setDownloading]   = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [jobDropdownOpen, setJobDropdownOpen] = useState(false)
  const [textDropdownOpen, setTextDropdownOpen] = useState(false)

  /* ── New: Tabs, status, notes, submit ────────────────────────────────── */
  const router = useRouter()
  type TabId = 'setup' | 'summary' | 'notes'
  const [tab, setTab] = useState<TabId>('setup')
  const [status, setStatus] = useState<'draft' | 'submitted'>(existingReport?.status ?? 'draft')
  const [internalNotes, setInternalNotes] = useState(existingReport?.internalNotes ?? '')
  const [confirmAction, setConfirmAction] = useState<'submit' | 'revert' | null>(null)
  const isReadOnly = status === 'submitted'
  const reportId = existingReport?.id

  const handleSubmitStatus = async (newStatus: 'draft' | 'submitted') => {
    if (!reportId) return
    try {
      await fetch(`/api/tenders/${tender.id}/report`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, status: newStatus }),
      })
      setStatus(newStatus)
    } catch {}
    setConfirmAction(null)
  }

  /* ── New: Image upload ───────────────────────────────────────────────── */
  const addImageBlock = () => {
    const section: TenderReportImageBlock = {
      type: 'image_block', id: nanoid(), images: [], columns: 2,
    }
    setSections(prev => [...prev, section])
  }

  const uploadImage = async (sectionId: string, files: FileList) => {
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch(`/api/tenders/${tender.id}/report/upload`, { method: 'POST', body: form })
        const { data } = await res.json()
        if (data?.url) {
          setSections(prev => prev.map(s => {
            if (s.id !== sectionId || s.type !== 'image_block') return s
            return { ...s, images: [...s.images, { url: data.url, caption: '' }] }
          }))
        }
      } catch {}
    }
  }

  /* ── Derived ──────────────────────────────────────────────────────────── */
  const usedTenderItemIds = useMemo(
    () => new Set(sections.filter((s): s is TenderReportJobLine => s.type === 'job_line').map(s => s.tenderItemId)),
    [sections],
  )

  const availableItems = useMemo(
    () => tenderItems.filter(ti => !usedTenderItemIds.has(ti.id)),
    [tenderItems, usedTenderItemIds],
  )

  const lineItems = useMemo(
    () => sections.filter((s): s is TenderReportJobLine | TenderReportCustomLine =>
      s.type === 'job_line' || s.type === 'custom_line'),
    [sections],
  )

  const subtotal = useMemo(
    () => lineItems.reduce((sum, s) => sum + computeFinalPrice(s.amount, s.marginPct), 0),
    [lineItems],
  )

  const grandTotal = useMemo(
    () => subtotal * (1 + overallMarginPct / 100),
    [subtotal, overallMarginPct],
  )

  /* ── Section helpers ──────────────────────────────────────────────────── */
  const updateSection = useCallback((id: string, patch: Partial<TenderReportSection>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } as TenderReportSection : s))
  }, [])

  const removeSection = useCallback((id: string) => {
    setSections(prev => prev.filter(s => s.id !== id))
  }, [])

  const moveSection = useCallback((idx: number, dir: -1 | 1) => {
    setSections(prev => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }, [])

  /* ── Add actions ──────────────────────────────────────────────────────── */
  const addJobLine = (tenderItem: any) => {
    const job = tenderItem.job
    const system = tenderItem.system
    const lastResults: JobLastResults | null = job?.lastResults ?? null
    const amount = lastResults?.totals?.grandTotal ?? 0

    const section: TenderReportJobLine = {
      type: 'job_line',
      id: nanoid(),
      tenderItemId: tenderItem.id,
      systemName: system?.name ?? 'Unknown System',
      jobName: job?.name ?? 'Unknown Job',
      description: `${system?.name ?? 'System'} \u2014 ${job?.name ?? 'Job'}`,
      amount,
      marginPct: 0,
      resultSnapshot: lastResults,
    }
    setSections(prev => [...prev, section])
    setJobDropdownOpen(false)
  }

  const addCustomLine = () => {
    const section: TenderReportCustomLine = {
      type: 'custom_line',
      id: nanoid(),
      description: '',
      amount: 0,
      marginPct: 0,
    }
    setSections(prev => [...prev, section])
  }

  const addTextBlock = (template?: TenderTemplate) => {
    const section: TenderReportTextBlock = {
      type: 'text_block',
      id: nanoid(),
      category: 'custom',
      title: template?.blockTitle ?? '',
      content: template?.blockContent ?? '',
      templateId: template?.id,
    }
    setSections(prev => [...prev, section])
    setTextDropdownOpen(false)
  }

  /* ── Build payload ────────────────────────────────────────────────────── */
  const buildPayload = () => ({
    title,
    reference: reference || null,
    date,
    validUntil: validUntil || null,
    preparedBy: preparedBy || null,
    revisionNo,
    currency,
    sections,
    overallMarginPct,
    paymentTerms: paymentTerms || null,
    validityPeriod: validityPeriod || null,
    disclaimer: disclaimer || null,
    notes: notes || null,
    showAppendix,
    status,
    internalNotes: internalNotes || null,
    companyName: profile?.companyName ?? null,
    companyLogo: profile?.companyLogo ?? null,
    companyAddr: profile?.address ?? null,
    registrationNo: profile?.registrationNumber ?? null,
    registrationLabel: profile?.registrationLabel ?? null,
    accentColor: profile?.reportAccentColor ?? null,
    clientName: tender?.client?.name ?? null,
    clientContact: tender?.client?.contactPerson ?? null,
    clientEmail: tender?.client?.email ?? null,
    clientAddr: tender?.client?.address ?? null,
  })

  /* ── API calls ────────────────────────────────────────────────────────── */
  const saveReport = async () => {
    setSaving(true); setError(null)
    try {
      const method = existingReport ? 'PATCH' : 'POST'
      const res = await fetch(`/api/tenders/${tender.id}/report`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save report')
    } finally {
      setSaving(false)
    }
  }

  const downloadPdf = async () => {
    setDownloading(true); setError(null)
    try {
      await saveReport()
      window.open(`/api/tenders/${tender.id}/report/pdf`, '_blank')
    } catch (e: any) {
      setError(e.message ?? 'Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  const saveAsTemplate = async () => {
    const name = window.prompt('Template name:')
    if (!name) return
    setError(null)
    try {
      const res = await fetch('/api/tenders/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category: 'full' as const,
          title,
          preparedBy,
          validityPeriod,
          paymentTerms,
          disclaimer,
          notes,
          defaultSections: sections,
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save template')
    }
  }

  /* ── Accent color helper ──────────────────────────────────────────────── */
  const accent = profile?.reportAccentColor ?? '#0f172a'

  /* ────────────────────────────────────────────────────────────────────── */
  /*  Render                                                               */
  /* ────────────────────────────────────────────────────────────────────── */

  /* ── Job Summary computed data ─────────────────────────────────────── */
  const jobLines = sections.filter((s): s is TenderReportJobLine => s.type === 'job_line')

  const summaryTotals = useMemo(() => {
    let material = 0, labour = 0, thirdParty = 0
    for (const jl of jobLines) {
      const t = jl.resultSnapshot?.totals
      if (t) { material += t.materialCost ?? 0; labour += t.labourCost ?? 0; thirdParty += t.thirdPartyCost ?? 0 }
    }
    return { material, labour, thirdParty, cost: material + labour + thirdParty }
  }, [jobLines])

  const summaryHours = useMemo(() => {
    const byPhase: Record<string, number> = {}
    for (const jl of jobLines) {
      const ws = jl.resultSnapshot?.workSchedule
      if (!ws?.byPhase) continue
      for (const [phase, results] of Object.entries(ws.byPhase)) {
        byPhase[phase] = (byPhase[phase] ?? 0) + (results as any[]).reduce((s: number, r: any) => s + (r.totalHours ?? 0), 0)
      }
    }
    return byPhase
  }, [jobLines])

  const summaryBom = useMemo(() => {
    const map = new Map<string, { name: string; code: string; unit: string; qty: number; unitPrice: number }>()
    for (const jl of jobLines) {
      for (const item of jl.resultSnapshot?.bom ?? []) {
        const key = item.productCode || item.name
        const existing = map.get(key)
        if (existing) { existing.qty += item.grandTotal ?? 0 }
        else { map.set(key, { name: item.name, code: item.productCode ?? '', unit: item.unit ?? '', qty: item.grandTotal ?? 0, unitPrice: item.unitPrice ?? 0 }) }
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [jobLines])

  const summaryProfit = useMemo(() => {
    return jobLines.map(jl => {
      const cost = jl.amount
      const revenue = computeFinalPrice(jl.amount, jl.marginPct)
      return { description: jl.description, cost, revenue, profit: revenue - cost, marginPct: jl.marginPct }
    })
  }, [jobLines])

  return (
    <div className="min-h-screen bg-surface-50">

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-surface border-b border-surface-200 px-4 py-2.5 flex items-center gap-3">
        <button onClick={() => router.push(`/tenders/${tender.id}`)}
          className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="h-4 w-px bg-surface-200" />
        <FileText className="w-4 h-4 text-ink-muted" />
        <span className="font-semibold text-sm text-ink">{title || 'Quotation'}</span>
        {reference && <code className="text-[10px] bg-surface-100 text-ink-muted px-1.5 py-0.5 rounded">{reference}</code>}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${status === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
          {status}
        </span>
        <div className="flex-1" />
        {error && <span className="text-xs text-red-500">{error}</span>}
        {status === 'draft' && reportId && (
          <Button size="xs" variant="secondary" icon={<Lock className="w-3 h-3" />}
            onClick={() => setConfirmAction('submit')}>Submit</Button>
        )}
        {status === 'submitted' && (
          <>
            <Button size="xs" variant="ghost" icon={<Unlock className="w-3 h-3" />}
              onClick={() => setConfirmAction('revert')}>Revert to Draft</Button>
            <Button size="xs" variant="secondary" icon={<Plus className="w-3 h-3" />}
              onClick={async () => {
                if (!reportId) return
                try {
                  const res = await fetch(`/api/tenders/${tender.id}/report`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ _action: 'duplicate', reportId }),
                  })
                  const { data } = await res.json()
                  if (data?.id) router.push(`/tenders/${tender.id}/report/${data.id}`)
                } catch {}
              }}>Duplicate</Button>
          </>
        )}
        <Button size="xs" variant="primary" loading={saving} icon={<Save className="w-3 h-3" />}
          onClick={saveReport} disabled={isReadOnly}>Save</Button>
        <Button size="xs" variant="secondary" loading={downloading} icon={<Download className="w-3 h-3" />}
          onClick={downloadPdf}>PDF</Button>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-surface-200 bg-surface-50">
        {([
          { id: 'setup' as TabId, label: 'Setup', Icon: FileText },
          { id: 'summary' as TabId, label: 'Job Summary', Icon: ClipboardList },
          { id: 'notes' as TabId, label: 'Notes', Icon: StickyNote },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-primary/10 text-primary font-semibold' : 'text-ink-muted hover:text-ink hover:bg-surface-100'
            }`} style={{ borderRadius: 'var(--radius)' }}>
            <t.Icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}

      {/* ── Notes Tab ──────────────────────────────────────────────── */}
      {tab === 'notes' && (
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="card p-6 space-y-3">
            <h2 className="font-semibold text-sm text-ink">Internal Notes</h2>
            <p className="text-xs text-ink-faint">For your reference only. Not included in the quotation PDF.</p>
            <textarea className="input text-sm resize-none w-full" rows={12} value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)} disabled={isReadOnly}
              placeholder="Add internal notes, reminders, or context about this quotation..." />
          </div>
        </div>
      )}

      {/* ── Job Summary Tab ────────────────────────────────────────── */}
      {tab === 'summary' && (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          {jobLines.length === 0 ? (
            <div className="card p-12 text-center text-sm text-ink-faint">No job lines added yet. Add runs in the Setup tab first.</div>
          ) : (
            <>
              {/* Cost Breakdown */}
              <div className="card p-5">
                <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">Cost Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Materials', value: summaryTotals.material },
                    { label: 'Labour', value: summaryTotals.labour },
                    { label: 'Third Party', value: summaryTotals.thirdParty },
                    { label: 'Total Cost', value: summaryTotals.cost },
                  ].map(c => (
                    <div key={c.label} className="text-center">
                      <div className="text-[10px] text-ink-faint uppercase">{c.label}</div>
                      <div className="text-lg font-mono font-bold text-ink">{fmtCurrency(c.value, currency)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hours by Phase */}
              {Object.keys(summaryHours).length > 0 && (
                <div className="card p-5">
                  <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">Hours by Phase</h3>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-surface-200 text-left">
                      <th className="py-2 text-xs text-ink-faint font-medium">Phase</th>
                      <th className="py-2 text-xs text-ink-faint font-medium text-right">Total Hours</th>
                    </tr></thead>
                    <tbody>
                      {Object.entries(summaryHours).map(([phase, hrs]) => (
                        <tr key={phase} className="border-b border-surface-100">
                          <td className="py-2 text-ink capitalize">{phase.replace('_', ' ')}</td>
                          <td className="py-2 text-right font-mono">{(hrs as number).toFixed(1)} hr</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Aggregated BOM */}
              {summaryBom.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">Aggregated Material List</h3>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-surface-200 text-left">
                      <th className="py-2 text-xs text-ink-faint font-medium">Material</th>
                      <th className="py-2 text-xs text-ink-faint font-medium">Code</th>
                      <th className="py-2 text-xs text-ink-faint font-medium text-center">Unit</th>
                      <th className="py-2 text-xs text-ink-faint font-medium text-right">Qty</th>
                      <th className="py-2 text-xs text-ink-faint font-medium text-right">Unit Price</th>
                      <th className="py-2 text-xs text-ink-faint font-medium text-right">Total</th>
                    </tr></thead>
                    <tbody>
                      {summaryBom.map((m, i) => (
                        <tr key={i} className="border-b border-surface-100">
                          <td className="py-2 text-ink">{m.name}</td>
                          <td className="py-2 text-ink-muted font-mono text-xs">{m.code}</td>
                          <td className="py-2 text-center text-ink-muted">{m.unit}</td>
                          <td className="py-2 text-right font-mono">{m.qty}</td>
                          <td className="py-2 text-right font-mono text-ink-muted">{m.unitPrice > 0 ? fmtCurrency(m.unitPrice, currency) : '—'}</td>
                          <td className="py-2 text-right font-mono font-semibold">{m.unitPrice > 0 ? fmtCurrency(m.qty * m.unitPrice, currency) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Profit Analysis */}
              <div className="card p-5">
                <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">Profit Analysis</h3>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-surface-200 text-left">
                    <th className="py-2 text-xs text-ink-faint font-medium">Item</th>
                    <th className="py-2 text-xs text-ink-faint font-medium text-right">Cost</th>
                    <th className="py-2 text-xs text-ink-faint font-medium text-right">Revenue</th>
                    <th className="py-2 text-xs text-ink-faint font-medium text-right">Profit</th>
                    <th className="py-2 text-xs text-ink-faint font-medium text-right">Margin</th>
                  </tr></thead>
                  <tbody>
                    {summaryProfit.map((p, i) => (
                      <tr key={i} className="border-b border-surface-100">
                        <td className="py-2 text-ink">{p.description || 'Untitled'}</td>
                        <td className="py-2 text-right font-mono text-ink-muted">{fmtCurrency(p.cost, currency)}</td>
                        <td className="py-2 text-right font-mono">{fmtCurrency(p.revenue, currency)}</td>
                        <td className="py-2 text-right font-mono font-semibold" style={{ color: p.profit >= 0 ? '#16a34a' : '#dc2626' }}>{fmtCurrency(p.profit, currency)}</td>
                        <td className="py-2 text-right">{p.marginPct}%</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-surface-300 font-bold">
                      <td className="py-2">Overall</td>
                      <td className="py-2 text-right font-mono">{fmtCurrency(summaryTotals.cost, currency)}</td>
                      <td className="py-2 text-right font-mono">{fmtCurrency(grandTotal, currency)}</td>
                      <td className="py-2 text-right font-mono" style={{ color: grandTotal - summaryTotals.cost >= 0 ? '#16a34a' : '#dc2626' }}>{fmtCurrency(grandTotal - summaryTotals.cost, currency)}</td>
                      <td className="py-2 text-right">{summaryTotals.cost > 0 ? ((grandTotal / summaryTotals.cost - 1) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Setup Tab ──────────────────────────────────────────────── */}
      {tab === 'setup' && (
      <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6">

      {/* ── Left: Editor ───────────────────────────────────────────────── */}
      <div className="w-full lg:w-[420px] flex-shrink-0 space-y-4 overflow-y-auto">

        {/* ── Header Fields ─────────────────────────────────────────── */}
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide">Header</h3>
          <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Reference" value={reference} onChange={e => setReference(e.target.value)} placeholder="QT-2026-001" />
            <Input label="Revision" value={revisionNo} onChange={e => setRevisionNo(e.target.value)} placeholder="1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Input label="Valid Until" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
          </div>
          <Input label="Prepared By" value={preparedBy} onChange={e => setPreparedBy(e.target.value)} />
          <Select
            label="Currency"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            options={['SGD','USD','AUD','GBP','EUR','MYR'].map(c => ({ value: c, label: c }))}
          />
        </div>

        {/* ── Sections ──────────────────────────────────────────────── */}
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide">Line Items & Content</h3>

          {sections.length === 0 && (
            <p className="text-xs text-ink-faint py-4 text-center">No sections yet. Add a job line, custom line, or text block.</p>
          )}

          {sections.map((section, idx) => {
            const badge = SECTION_BADGES[section.type]
            return (
              <div key={section.id} className="border border-surface-300 rounded-lg p-3 space-y-2 bg-white">
                {/* Section header */}
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${badge.color}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs font-medium text-ink truncate flex-1">
                    {section.type === 'text_block' ? (section.title || 'Text Block') : (section as any).description || 'Untitled'}
                  </span>
                  <button onClick={() => moveSection(idx, -1)} disabled={idx === 0}
                    className="p-0.5 text-ink-faint hover:text-ink disabled:opacity-30">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1}
                    className="p-0.5 text-ink-faint hover:text-ink disabled:opacity-30">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => removeSection(section.id)}
                    className="p-0.5 text-red-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Job Line fields */}
                {section.type === 'job_line' && (
                  <div className="space-y-2">
                    <Input label="Description" value={section.description}
                      onChange={e => updateSection(section.id, { description: e.target.value })} />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="label">Raw Cost</label>
                        <input className="input text-sm text-right font-mono bg-surface-100" readOnly
                          value={fmtCurrency(section.amount, currency)} />
                      </div>
                      <NumberInput label="Margin %" value={section.marginPct} unit="%"
                        onChange={e => updateSection(section.id, { marginPct: parseFloat(e.target.value) || 0 })} />
                      <div>
                        <label className="label">Final Price</label>
                        <input className="input text-sm text-right font-mono bg-surface-100 font-bold" readOnly
                          value={fmtCurrency(computeFinalPrice(section.amount, section.marginPct), currency)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Line fields */}
                {section.type === 'custom_line' && (
                  <div className="space-y-2">
                    <Input label="Description" value={section.description} placeholder="Additional works..."
                      onChange={e => updateSection(section.id, { description: e.target.value })} />
                    <div className="grid grid-cols-3 gap-2">
                      <NumberInput label="Amount" value={section.amount} unit={currency} min={0}
                        onChange={e => updateSection(section.id, { amount: parseFloat(e.target.value) || 0 })} />
                      <NumberInput label="Margin %" value={section.marginPct} unit="%"
                        onChange={e => updateSection(section.id, { marginPct: parseFloat(e.target.value) || 0 })} />
                      <div>
                        <label className="label">Final Price</label>
                        <input className="input text-sm text-right font-mono bg-surface-100 font-bold" readOnly
                          value={fmtCurrency(computeFinalPrice(section.amount, section.marginPct), currency)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Text Block fields */}
                {section.type === 'text_block' && (
                  <div className="space-y-2">
                    <Input label="Title (optional)" value={section.title ?? ''} placeholder="Terms & Conditions"
                      onChange={e => updateSection(section.id, { title: e.target.value })} disabled={isReadOnly} />
                    <div>
                      <label className="label">Content</label>
                      <textarea className="input text-sm resize-none" rows={4} value={section.content}
                        onChange={e => updateSection(section.id, { content: e.target.value })} disabled={isReadOnly}
                        placeholder="Enter text content..." />
                    </div>
                  </div>
                )}

                {/* Image Block fields */}
                {section.type === 'image_block' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="label mb-0">Columns</label>
                      {[1, 2, 3, 4].map(n => (
                        <button key={n} type="button" onClick={() => updateSection(section.id, { columns: n })}
                          className={`w-7 h-7 text-xs font-bold rounded transition-colors ${section.columns === n ? 'bg-primary text-white' : 'bg-surface-100 text-ink-muted hover:bg-surface-200'}`}
                          disabled={isReadOnly}>{n}</button>
                      ))}
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${section.columns}, 1fr)` }}>
                      {section.images.map((img, ii) => (
                        <div key={ii} className="border border-surface-200 rounded overflow-hidden bg-surface-50">
                          <img src={img.url} alt="" className="w-full h-24 object-cover" />
                          <div className="p-1.5 flex items-center gap-1">
                            <input className="input text-[10px] py-0.5 flex-1" value={img.caption ?? ''} placeholder="Caption"
                              disabled={isReadOnly}
                              onChange={e => {
                                const images = [...section.images]
                                images[ii] = { ...img, caption: e.target.value }
                                updateSection(section.id, { images })
                              }} />
                            {!isReadOnly && (
                              <button onClick={() => {
                                const images = section.images.filter((_, j) => j !== ii)
                                updateSection(section.id, { images })
                              }} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 className="w-3 h-3" /></button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {!isReadOnly && (
                      <label className="flex items-center justify-center gap-2 border-2 border-dashed border-surface-300 rounded py-3 text-xs text-ink-faint hover:border-primary hover:text-primary cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" /> Upload images
                        <input type="file" accept="image/*" multiple className="hidden"
                          onChange={e => { if (e.target.files) uploadImage(section.id, e.target.files); e.target.value = '' }} />
                      </label>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Add buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {/* Add Job Line */}
            <div className="relative">
              <Button size="sm" variant="secondary" icon={<Briefcase className="w-3.5 h-3.5" />}
                onClick={() => setJobDropdownOpen(!jobDropdownOpen)}
                disabled={availableItems.length === 0}>
                Add Job Line
              </Button>
              {jobDropdownOpen && availableItems.length > 0 && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-surface-300 rounded-lg shadow-lg w-64 max-h-48 overflow-y-auto">
                  {availableItems.map(ti => (
                    <button key={ti.id} onClick={() => addJobLine(ti)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-surface-100 border-b border-surface-200 last:border-0">
                      <div className="font-medium text-ink">{ti.system?.name ?? 'System'}</div>
                      <div className="text-xs text-ink-muted">{ti.job?.name ?? 'Job'} &middot; {fmtCurrency(ti.job?.lastResults?.totals?.grandTotal ?? 0, currency)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add Custom Line */}
            <Button size="sm" variant="secondary" icon={<DollarSign className="w-3.5 h-3.5" />}
              onClick={addCustomLine}>
              Add Custom Line
            </Button>

            {/* Add Text Block */}
            <div className="relative">
              <Button size="sm" variant="secondary" icon={<Type className="w-3.5 h-3.5" />}
                onClick={() => setTextDropdownOpen(!textDropdownOpen)}>
                Add Text Block
              </Button>
              {textDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-surface-300 rounded-lg shadow-lg w-56 max-h-48 overflow-y-auto">
                  <button onClick={() => addTextBlock()}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-100 border-b border-surface-200 font-medium text-ink">
                    <Plus className="w-3 h-3 inline mr-1" /> Custom Block
                  </button>
                  {templates.filter(t => t.category === 'text_block').map(t => (
                    <button key={t.id} onClick={() => addTextBlock(t)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-surface-100 border-b border-surface-200 last:border-0">
                      <div className="font-medium text-ink">{t.name}</div>
                      {t.blockTitle && <div className="text-xs text-ink-muted">{t.blockTitle}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add Image Block */}
            <Button size="sm" variant="secondary" icon={<Upload className="w-3.5 h-3.5" />}
              onClick={addImageBlock} disabled={isReadOnly}>
              Add Images
            </Button>
          </div>
        </div>

        {/* ── Cost Summary ──────────────────────────────────────────── */}
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide">Cost Summary</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Subtotal</span>
            <span className="font-mono font-semibold text-ink">{fmtCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-muted whitespace-nowrap">Overall Margin</span>
            <NumberInput value={overallMarginPct} unit="%" className="w-24"
              onChange={e => setOverallMarginPct(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t border-surface-300">
            <span className="font-bold text-ink">Grand Total</span>
            <span className="font-mono font-black text-lg" style={{ color: accent }}>{fmtCurrency(grandTotal, currency)}</span>
          </div>
        </div>

        {/* ── Footer Fields ─────────────────────────────────────────── */}
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide">Footer</h3>
          <div>
            <label className="label">Payment Terms</label>
            <textarea className="input text-sm resize-none" rows={2} value={paymentTerms}
              onChange={e => setPaymentTerms(e.target.value)} placeholder="50% upon order, 50% upon delivery..." />
          </div>
          <Input label="Validity Period" value={validityPeriod}
            onChange={e => setValidityPeriod(e.target.value)} placeholder="30 days from date of quotation" />
          <div>
            <label className="label">Disclaimer</label>
            <textarea className="input text-sm resize-none" rows={2} value={disclaimer}
              onChange={e => setDisclaimer(e.target.value)} placeholder="Prices are subject to..." />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input text-sm resize-none" rows={2} value={notes}
              onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." />
          </div>
        </div>

        {/* ── Appendix Toggle ───────────────────────────────────────── */}
        <div className="card p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={showAppendix} onChange={e => setShowAppendix(e.target.checked)}
              className="w-4 h-4 rounded border-surface-300 text-primary focus:ring-primary" />
            <div>
              <div className="text-sm font-medium text-ink">Include Appendix</div>
              <div className="text-xs text-ink-faint">Attach detailed BOM breakdown for each job line</div>
            </div>
          </label>
        </div>

        {/* ── Error ─────────────────────────────────────────────────── */}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
        )}

        {/* ── Action Buttons ────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 pb-4">
          <Button variant="primary" fullWidth loading={saving} icon={<Save className="w-4 h-4" />}
            onClick={saveReport}>
            Save
          </Button>
          <Button variant="secondary" fullWidth loading={downloading} icon={<Download className="w-4 h-4" />}
            onClick={downloadPdf}>
            Download PDF
          </Button>
          <Button variant="ghost" fullWidth icon={<BookTemplate className="w-4 h-4" />}
            onClick={saveAsTemplate}>
            Save as Template
          </Button>
        </div>
      </div>

      {/* ── Right: Preview ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="card overflow-hidden bg-white">

          {/* Preview header */}
          <div className="p-5 border-b border-surface-300" style={{ borderBottomColor: accent + '30' }}>
            <div className="flex items-start justify-between">
              <div>
                {profile?.companyName && (
                  <div className="font-bold text-sm text-ink mb-0.5">{profile.companyName}</div>
                )}
                <div className="text-xl font-display font-black" style={{ color: accent }}>
                  {title || 'Untitled Quotation'}
                </div>
                <div className="text-xs text-ink-muted mt-1 space-x-3">
                  {reference && <span>Ref: {reference}</span>}
                  {revisionNo && <span>Rev {revisionNo}</span>}
                  <span>{date ? format(new Date(date), 'dd MMM yyyy') : ''}</span>
                </div>
                {preparedBy && <div className="text-xs text-ink-muted mt-0.5">Prepared by: {preparedBy}</div>}
                {tender?.client?.name && <div className="text-xs text-ink-muted">Client: {tender.client.name}</div>}
                {validUntil && <div className="text-xs text-ink-muted">Valid until: {format(new Date(validUntil), 'dd MMM yyyy')}</div>}
              </div>
              {profile?.companyLogo && (
                <img src={profile.companyLogo} alt="logo" className="h-12 object-contain ml-4" />
              )}
            </div>
          </div>

          {/* Preview line items table */}
          {lineItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-100">
                    <th className="text-left px-3 py-2 font-bold text-ink-muted uppercase tracking-wide text-[10px] w-6">#</th>
                    <th className="text-left px-3 py-2 font-bold text-ink-muted uppercase tracking-wide text-[10px]">Description</th>
                    <th className="px-3 py-2 font-bold text-ink-muted uppercase tracking-wide text-[10px] text-right w-24">Amount</th>
                    <th className="px-3 py-2 font-bold text-ink-muted uppercase tracking-wide text-[10px] text-center w-16">Margin</th>
                    <th className="px-3 py-2 font-bold text-ink-muted uppercase tracking-wide text-[10px] text-right w-28">Final Price</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-surface-50'}>
                      <td className="px-3 py-2 text-ink-faint">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-ink">{item.description || 'Untitled'}</div>
                        {item.type === 'job_line' && (
                          <div className="text-ink-faint text-[10px]">{(item as TenderReportJobLine).systemName} &middot; {(item as TenderReportJobLine).jobName}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-ink-muted">{fmtCurrency(item.amount, currency)}</td>
                      <td className="px-3 py-2 text-center text-ink-muted">{item.marginPct > 0 ? `${item.marginPct}%` : '\u2014'}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-ink">{fmtCurrency(computeFinalPrice(item.amount, item.marginPct), currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-surface-300 bg-surface-50">
                    <td colSpan={4} className="px-3 py-2 text-right font-bold text-ink-muted text-xs">Subtotal</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-ink">{fmtCurrency(subtotal, currency)}</td>
                  </tr>
                  {overallMarginPct > 0 && (
                    <tr className="bg-surface-50">
                      <td colSpan={4} className="px-3 py-2 text-right text-ink-muted text-xs">Overall Margin ({overallMarginPct}%)</td>
                      <td className="px-3 py-2 text-right font-mono text-ink-muted">{fmtCurrency(grandTotal - subtotal, currency)}</td>
                    </tr>
                  )}
                  <tr style={{ background: accent }}>
                    <td colSpan={4} className="px-3 py-2 text-right text-white font-bold text-xs">GRAND TOTAL</td>
                    <td className="px-3 py-2 text-right text-white font-mono font-black">{fmtCurrency(grandTotal, currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Preview text blocks */}
          {sections.filter((s): s is TenderReportTextBlock => s.type === 'text_block').map(block => (
            <div key={block.id} className="px-5 py-3 border-t border-surface-200">
              {block.title && <div className="text-xs font-bold text-ink uppercase tracking-wide mb-1">{block.title}</div>}
              <div className="text-xs text-ink whitespace-pre-wrap">{block.content || 'Empty text block'}</div>
            </div>
          ))}

          {/* Preview footer */}
          {(paymentTerms || validityPeriod || disclaimer || notes) && (
            <div className="border-t border-surface-300 px-5 py-4 space-y-2">
              {paymentTerms && (
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">Payment Terms</div>
                  <div className="text-xs text-ink whitespace-pre-wrap">{paymentTerms}</div>
                </div>
              )}
              {validityPeriod && (
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">Validity</div>
                  <div className="text-xs text-ink">{validityPeriod}</div>
                </div>
              )}
              {disclaimer && (
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">Disclaimer</div>
                  <div className="text-xs text-ink-faint whitespace-pre-wrap">{disclaimer}</div>
                </div>
              )}
              {notes && (
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">Notes</div>
                  <div className="text-xs text-ink whitespace-pre-wrap">{notes}</div>
                </div>
              )}
            </div>
          )}

          {/* Appendix indicator */}
          {showAppendix && sections.some(s => s.type === 'job_line') && (
            <div className="px-5 py-3 border-t border-surface-200 bg-surface-50">
              <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wide mb-1">Appendix</div>
              <div className="text-xs text-ink-faint">
                Detailed BOM breakdown will be attached for {sections.filter(s => s.type === 'job_line').length} job line(s).
              </div>
            </div>
          )}

          {/* Empty state */}
          {sections.length === 0 && (
            <div className="p-12 text-center text-ink-faint text-sm">
              Add line items and text blocks to see a preview.
            </div>
          )}
        </div>
      </div>
      </div>
      )}
      {/* end setup tab */}

      {/* ── Confirm Modals ──────────────────────────────────────────── */}
      <ConfirmModal
        open={confirmAction === 'submit'}
        title="Submit quotation?"
        message="This quotation will become read-only. You can revert to draft later if needed."
        onConfirm={() => handleSubmitStatus('submitted')}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmModal
        open={confirmAction === 'revert'}
        title="Revert to draft?"
        message="This will unlock the quotation for editing."
        onConfirm={() => handleSubmitStatus('draft')}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
