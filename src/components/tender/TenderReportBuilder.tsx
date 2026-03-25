// src/components/tender/TenderReportBuilder.tsx
'use client'
import { useState, useMemo, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { format } from 'date-fns'
import {
  Plus, Trash2, ChevronUp, ChevronDown, Download, Save,
  BookTemplate, FileText, GripVertical, DollarSign, Type,
  Briefcase, X,
} from 'lucide-react'
import { Button, Input, Select, Modal } from '@/components/ui'
import { NumberInput } from '@/components/ui/Input'
import type {
  TenderReport,
  TenderReportSection,
  TenderReportJobLine,
  TenderReportCustomLine,
  TenderReportTextBlock,
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

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-h-[90vh] overflow-auto">

      {/* ── Left: Editor ───────────────────────────────────────────────── */}
      <div className="w-full lg:w-[420px] flex-shrink-0 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="font-display font-bold text-base text-ink flex items-center gap-2">
            <FileText className="w-4 h-4" /> Quotation Builder
          </div>
          {onClose && (
            <button onClick={onClose} className="text-ink-faint hover:text-ink"><X className="w-5 h-5" /></button>
          )}
        </div>

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
                      onChange={e => updateSection(section.id, { title: e.target.value })} />
                    <div>
                      <label className="label">Content</label>
                      <textarea className="input text-sm resize-none" rows={4} value={section.content}
                        onChange={e => updateSection(section.id, { content: e.target.value })}
                        placeholder="Enter text content..." />
                    </div>
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
  )
}
