// src/components/doc-builder/DocBuilder.tsx
'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Save, Loader2, FileText, Plus, Download, X } from 'lucide-react'
import { arrayMove } from '@dnd-kit/sortable'
import type { DocBlock, DocBranding, DocSettings } from '@/lib/doc-builder/types'
import BlockPalette, { type TemplateBlock } from './BlockPalette'
import PageCanvas, { PAGE_SIZES, type PageSizeKey } from './PageCanvas'

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
          <BlockPalette onAddBlock={handleAddBlock} templates={templates} />
        </aside>

        {/* ── Mobile: Blocks tab ── */}
        {mobileTab === 'blocks' && (
          <div className="absolute inset-0 z-10 bg-surface-50 overflow-y-auto lg:hidden">
            <BlockPalette onAddBlock={handleAddBlock} templates={templates} />
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
              <BlockPalette onAddBlock={handleAddBlock} templates={templates} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
