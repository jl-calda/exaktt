// src/components/doc-builder/DocBuilder.tsx
'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Save, Loader2, FileText, Plus, Download, X } from 'lucide-react'
import { arrayMove } from '@dnd-kit/sortable'
import type { DocBlock, DocBranding, DocSettings, DocEstimate, TableColumn } from '@/lib/doc-builder/types'
import BlockPalette, { type TemplateBlock } from './BlockPalette'
import PageCanvas, { PAGE_SIZES, type PageSizeKey } from './PageCanvas'

let _uid = 0
function uid() { _uid++; return `blk_${Date.now()}_${_uid}` }

function insertEstimateIntoTable(
  table: Extract<DocBlock, { type: 'table' }>,
  est: DocEstimate,
  mode: 'summary' | 'breakdown',
): Extract<DocBlock, { type: 'table' }> {
  const { columns, rows } = table.data
  const snap = est.resultSnapshot
  const startNum = rows.length + 1

  if (mode === 'summary') {
    const row: Record<string, any> = {}
    const noCol = columns.find(c => c.key === 'no' || c.label === '#')
    if (noCol) row[noCol.key] = startNum
    const descCol = columns.find(c => c.key === 'description' || c.key === 'item' || c.label.toLowerCase().includes('description'))
    if (descCol) row[descCol.key] = est.description
    for (const col of columns) {
      if (col.format === 'currency' || col.key === 'amount' || col.key === 'total') row[col.key] = est.amount
      if (row[col.key] === undefined) row[col.key] = ''
    }
    return { ...table, data: { ...table.data, rows: [...rows, row] } }
  }

  // Breakdown mode — insert BOM rows + cost summary
  if (!snap?.bom?.length) {
    // No BOM data — fall back to summary
    return insertEstimateIntoTable(table, est, 'summary')
  }

  // Ensure table has unit/qty/unitPrice columns
  let cols = [...columns]
  const hasUnit = cols.some(c => c.key === 'unit')
  const hasQty = cols.some(c => c.key === 'qty')
  const hasUnitPrice = cols.some(c => c.key === 'unitPrice')
  const descIdx = cols.findIndex(c => c.key === 'description' || c.key === 'item')
  const insertAt = descIdx >= 0 ? descIdx + 1 : 1

  const newCols: TableColumn[] = []
  if (!hasUnit) newCols.push({ key: 'unit', label: 'Unit', width: '50px', align: 'center' })
  if (!hasQty) newCols.push({ key: 'qty', label: 'Qty', width: '60px', align: 'right', format: 'number' })
  if (!hasUnitPrice) newCols.push({ key: 'unitPrice', label: 'Unit Price', width: '90px', align: 'right', format: 'currency' })
  if (newCols.length > 0) {
    cols = [...cols.slice(0, insertAt), ...newCols, ...cols.slice(insertAt)]
  }

  // Build BOM rows
  const bomRows: Record<string, any>[] = snap.bom.map((m: any, i: number) => {
    const row: Record<string, any> = {}
    for (const col of cols) {
      if (col.key === 'no' || col.label === '#') row[col.key] = startNum + i
      else if (col.key === 'description' || col.key === 'item') row[col.key] = m.name + (m.productCode ? ` — ${m.productCode}` : '')
      else if (col.key === 'unit') row[col.key] = m.unit ?? ''
      else if (col.key === 'qty') row[col.key] = m.grandTotal ?? 0
      else if (col.key === 'unitPrice') row[col.key] = m.unitPrice ?? 0
      else if (col.format === 'currency' || col.key === 'amount' || col.key === 'total') row[col.key] = m.lineTotal ?? 0
      else row[col.key] = ''
    }
    return row
  })

  // Cost summary rows
  const summaryRows: Record<string, any>[] = []
  const totals = snap.totals
  if (totals) {
    const makeSummaryRow = (label: string, amount: number) => {
      const row: Record<string, any> = {}
      for (const col of cols) {
        if (col.key === 'description' || col.key === 'item') row[col.key] = label
        else if (col.format === 'currency' || col.key === 'amount' || col.key === 'total') row[col.key] = amount
        else row[col.key] = ''
      }
      return row
    }
    if (totals.materialCost > 0) summaryRows.push(makeSummaryRow('Material Cost', totals.materialCost))
    if (totals.labourCost > 0) summaryRows.push(makeSummaryRow('Labour Cost', totals.labourCost))
    if (totals.thirdPartyCost > 0) summaryRows.push(makeSummaryRow('Third Party Cost', totals.thirdPartyCost))
    summaryRows.push(makeSummaryRow('Grand Total', totals.grandTotal))
  }

  return {
    ...table,
    data: { ...table.data, columns: cols, rows: [...rows, ...bomRows, ...summaryRows] },
  }
}

function createTableWithEstimate(est: DocEstimate, mode: 'summary' | 'breakdown'): Extract<DocBlock, { type: 'table' }> {
  const base: Extract<DocBlock, { type: 'table' }> = {
    type: 'table',
    id: uid(),
    data: {
      columns: [
        { key: 'no', label: '#', width: '30px', align: 'center' as const },
        { key: 'description', label: 'Description', align: 'left' as const },
        { key: 'amount', label: 'Amount', width: '100px', align: 'right' as const, format: 'currency' as const },
        { key: 'total', label: 'Total', width: '100px', align: 'right' as const, format: 'currency' as const },
      ],
      rows: [],
      showTotals: true,
      totalLabel: 'Subtotal',
    },
  }
  return insertEstimateIntoTable(base, est, mode)
}

interface Props {
  documentId?: string
  initialBlocks: DocBlock[]
  initialTitle: string
  initialRef?: string | null
  initialStatus?: string
  branding: DocBranding
  settings?: DocSettings | null
  docType: string
  templates?: TemplateBlock[]
  estimates?: DocEstimate[]
  onSave?: (data: { title: string; ref: string | null; status: string; blocks: DocBlock[]; settings?: DocSettings }) => Promise<void>
}

type MobileTab = 'canvas' | 'blocks'

export default function DocBuilder({
  documentId,
  initialBlocks,
  initialTitle,
  initialRef,
  initialStatus,
  branding,
  settings,
  docType,
  templates,
  estimates,
  onSave,
}: Props) {
  const [blocks, setBlocks] = useState<DocBlock[]>(initialBlocks)
  const [title, setTitle] = useState(initialTitle)
  const [ref, setRef] = useState(initialRef ?? '')
  const [status, setStatus] = useState(initialStatus ?? 'draft')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('canvas')
  const [showPalette, setShowPalette] = useState(false)
  const [pageSize, setPageSize] = useState<PageSizeKey>((settings?.pageSize as PageSizeKey) ?? 'A4')
  const [zoom, setZoom] = useState(100)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Track initial load vs actual changes
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    setDirty(true)
  }, [blocks, title, ref, status])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  useEffect(() => {
    if (!dirty || !onSave || !documentId) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      try {
        await onSave({ title, ref: ref || null, status, blocks, settings: { ...settings, pageSize } })
        setDirty(false)
      } catch {}
    }, 2000)
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
  }, [blocks, title, ref, status, dirty, onSave, documentId, pageSize, settings])

  function handleAddBlock(block: DocBlock) {
    setBlocks(prev => [...prev, block])
    setMobileTab('canvas')
    setShowPalette(false)
  }

  function handleInsertBlock(block: DocBlock, afterId?: string) {
    if (!afterId) {
      setBlocks(prev => [...prev, block])
    } else {
      setBlocks(prev => {
        const idx = prev.findIndex(b => b.id === afterId)
        if (idx < 0) return [...prev, block]
        const next = [...prev]
        next.splice(idx + 1, 0, block)
        return next
      })
    }
    setMobileTab('canvas')
    setShowPalette(false)
  }

  function handleUpdateBlock(id: string, data: any) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, data } : b))
  }

  function handleRemoveBlock(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  function handleMoveBlock(id: string, dir: -1 | 1) {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (idx < 0) return prev
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= prev.length) return prev
      return arrayMove(prev, idx, newIdx)
    })
  }

  function handleReorder(activeId: string, overId: string) {
    setBlocks(prev => {
      const oldIdx = prev.findIndex(b => b.id === activeId)
      const newIdx = prev.findIndex(b => b.id === overId)
      if (oldIdx < 0 || newIdx < 0) return prev
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  function handleInsertEstimate(est: DocEstimate, mode: 'summary' | 'breakdown') {
    setBlocks(prev => {
      // Find last table block, or create one
      const lastTableIdx = prev.map((b, i) => b.type === 'table' ? i : -1).filter(i => i >= 0).pop()
      if (lastTableIdx != null) {
        const table = prev[lastTableIdx] as Extract<DocBlock, { type: 'table' }>
        const updated = insertEstimateIntoTable(table, est, mode)
        const next = [...prev]
        next[lastTableIdx] = updated
        return next
      }
      // No table exists — create one with the estimate data
      const newTable = createTableWithEstimate(est, mode)
      return [...prev, newTable]
    })
    setMobileTab('canvas')
    setShowPalette(false)
  }

  async function handleManualSave() {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave({ title, ref: ref || null, status, blocks, settings: { ...settings, pageSize } })
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      if (documentId) {
        // Download from server API
        const res = await fetch(`/api/documents/${documentId}/pdf`)
        if (!res.ok) throw new Error('PDF download failed')
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = (title || 'document').replace(/[^a-z0-9_-]/gi, '_') + '.pdf'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(a.href)
      } else {
        // Generate client-side
        const { pdf } = await import('@react-pdf/renderer')
        const { RenderDocument } = await import('@/lib/pdf/render')
        const React = await import('react')
        const element = React.createElement(RenderDocument, {
          title,
          blocks,
          branding,
          settings: { ...settings, pageSize },
        })
        const blob = await pdf(element as any).toBlob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = (title || 'document').replace(/[^a-z0-9_-]/gi, '_') + '.pdf'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Download error:', err)
    } finally {
      setDownloading(false)
    }
  }, [documentId, title, blocks, branding, settings, pageSize])

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 border-b border-surface-200 bg-surface-50 shrink-0">
        <FileText className="w-4 h-4 text-ink-faint hidden sm:block" />
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="text-xs sm:text-sm font-semibold text-ink bg-transparent outline-none flex-1 min-w-0"
          placeholder="Document title"
        />
        <input
          value={ref}
          onChange={e => setRef(e.target.value)}
          className="input text-[10px] w-20 sm:w-28 hidden sm:block"
          placeholder="Reference"
        />

        {/* Page size selector */}
        <select
          value={pageSize}
          onChange={e => setPageSize(e.target.value as PageSizeKey)}
          className="text-[10px] px-1.5 py-1 border border-surface-200 rounded bg-surface-50 hidden sm:block"
        >
          {Object.entries(PAGE_SIZES).map(([key, s]) => (
            <option key={key} value={key}>{s.label}</option>
          ))}
        </select>

        {/* Zoom control */}
        <select
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          className="text-[10px] px-1.5 py-1 border border-surface-200 rounded bg-surface-50 hidden lg:block"
        >
          <option value={75}>75%</option>
          <option value={100}>100%</option>
          <option value={125}>125%</option>
        </select>

        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="text-[10px] px-1.5 sm:px-2 py-1 border border-surface-200 rounded bg-surface-50"
        >
          <option value="draft">Draft</option>
          <option value="final">Final</option>
        </select>

        {dirty && <span className="text-[10px] text-ink-faint hidden sm:inline">Unsaved</span>}

        {/* Download PDF */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="btn-ghost inline-flex items-center gap-1 px-2 py-1.5 text-[10px] sm:text-[11px]"
          title="Download PDF"
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">PDF</span>
        </button>

        {onSave && (
          <button
            onClick={handleManualSave}
            disabled={saving}
            className="btn-primary inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[10px] sm:text-[11px]"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Save</span>
          </button>
        )}
      </div>

      {/* ── Mobile tab bar (visible < lg) ── */}
      <div className="flex lg:hidden border-b border-surface-200 bg-surface-50">
        <button
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${
            mobileTab === 'canvas' ? 'text-primary border-b-2 border-primary' : 'text-ink-muted'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Document
        </button>
        <button
          onClick={() => setMobileTab('blocks')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${
            mobileTab === 'blocks' ? 'text-primary border-b-2 border-primary' : 'text-ink-muted'
          }`}
        >
          <Plus className="w-3.5 h-3.5" /> Blocks
        </button>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Desktop: Left palette sidebar ── */}
        <aside className="hidden lg:block w-48 shrink-0 border-r border-surface-200 bg-surface-50 overflow-y-auto">
          <BlockPalette onAddBlock={handleAddBlock} templates={templates} estimates={estimates} onInsertEstimate={handleInsertEstimate} />
        </aside>

        {/* ── Mobile: Blocks tab ── */}
        {mobileTab === 'blocks' && (
          <div className="absolute inset-0 z-10 bg-surface-50 overflow-y-auto lg:hidden">
            <BlockPalette onAddBlock={handleAddBlock} templates={templates} estimates={estimates} onInsertEstimate={handleInsertEstimate} />
          </div>
        )}

        {/* ── Page Canvas (center, takes up remaining space) ── */}
        <div className={`flex-1 overflow-hidden ${mobileTab !== 'canvas' ? 'hidden lg:block' : ''}`}>
          <PageCanvas
            blocks={blocks}
            branding={branding}
            settings={settings}
            documentId={documentId}
            pageSize={pageSize}
            zoom={zoom}
            estimates={estimates}
            onUpdate={handleUpdateBlock}
            onRemove={handleRemoveBlock}
            onMove={handleMoveBlock}
            onReorder={handleReorder}
            onInsertBlock={handleInsertBlock}
          />

          {/* Mobile: floating add block button */}
          <div className="lg:hidden fixed bottom-4 right-4 z-20">
            <button
              onClick={() => setShowPalette(!showPalette)}
              className="btn-primary w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
            >
              {showPalette ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile: floating palette sheet */}
          {showPalette && mobileTab === 'canvas' && (
            <div className="lg:hidden fixed bottom-20 right-4 z-20 w-56 max-h-[60vh] bg-surface-50 border border-surface-200 rounded-xl shadow-lg overflow-y-auto animate-fade-in">
              <BlockPalette onAddBlock={handleAddBlock} templates={templates} estimates={estimates} onInsertEstimate={handleInsertEstimate} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
