// src/components/doc-builder/DocBuilder.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { Save, Loader2, FileText, Plus, Eye, PenLine, X } from 'lucide-react'
import { arrayMove } from '@dnd-kit/sortable'
import type { DocBlock, DocBranding, DocSettings } from '@/lib/doc-builder/types'
import DndProvider from './dnd/DndProvider'
import BlockPalette from './BlockPalette'
import EditorPane from './EditorPane'
import PreviewPane from './PreviewPane'

interface Props {
  documentId?: string
  initialBlocks: DocBlock[]
  initialTitle: string
  initialRef?: string | null
  initialStatus?: string
  branding: DocBranding
  settings?: DocSettings | null
  docType: string
  onSave?: (data: { title: string; ref: string | null; status: string; blocks: DocBlock[] }) => Promise<void>
}

type MobileTab = 'editor' | 'preview' | 'blocks'

export default function DocBuilder({
  documentId,
  initialBlocks,
  initialTitle,
  initialRef,
  initialStatus,
  branding,
  settings,
  docType,
  onSave,
}: Props) {
  const [blocks, setBlocks] = useState<DocBlock[]>(initialBlocks)
  const [title, setTitle] = useState(initialTitle)
  const [ref, setRef] = useState(initialRef ?? '')
  const [status, setStatus] = useState(initialStatus ?? 'draft')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('editor')
  const [showPalette, setShowPalette] = useState(false)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => { setDirty(true) }, [blocks, title, ref, status])

  useEffect(() => {
    if (!dirty || !onSave || !documentId) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      try {
        await onSave({ title, ref: ref || null, status, blocks })
        setDirty(false)
      } catch {}
    }, 2000)
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
  }, [blocks, title, ref, status, dirty, onSave, documentId])

  function handleAddBlock(block: DocBlock) {
    setBlocks(prev => [...prev, block])
    setMobileTab('editor')
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
      await onSave({ title, ref: ref || null, status, blocks })
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  const blockIds = blocks.map(b => b.id)

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
          className="input text-[10px] w-20 sm:w-32 hidden sm:block"
          placeholder="Reference"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="text-[10px] px-1.5 sm:px-2 py-1 border border-surface-200 rounded bg-surface-50"
        >
          <option value="draft">Draft</option>
          <option value="final">Final</option>
        </select>
        {dirty && <span className="text-[9px] text-ink-faint hidden sm:inline">Unsaved</span>}
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
          onClick={() => setMobileTab('editor')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${
            mobileTab === 'editor' ? 'text-primary border-b-2 border-primary' : 'text-ink-muted'
          }`}
        >
          <PenLine className="w-3.5 h-3.5" /> Editor
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${
            mobileTab === 'preview' ? 'text-primary border-b-2 border-primary' : 'text-ink-muted'
          }`}
        >
          <Eye className="w-3.5 h-3.5" /> Preview
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

        {/* ── Desktop: Left palette (hidden on mobile) ── */}
        <aside className="hidden lg:block w-48 shrink-0 border-r border-surface-200 bg-surface-50 overflow-y-auto">
          <BlockPalette onAddBlock={handleAddBlock} />
        </aside>

        {/* ── Mobile: Blocks tab ── */}
        {mobileTab === 'blocks' && (
          <div className="absolute inset-0 z-10 bg-surface-50 overflow-y-auto lg:hidden">
            <BlockPalette onAddBlock={handleAddBlock} />
          </div>
        )}

        {/* ── Editor (center on desktop, full on mobile editor tab) ── */}
        <div className={`flex-1 overflow-y-auto bg-surface-100/30 ${
          mobileTab !== 'editor' ? 'hidden lg:block' : ''
        }`}>
          <DndProvider items={blockIds} onReorder={handleReorder}>
            <EditorPane
              blocks={blocks}
              branding={branding}
              documentId={documentId}
              onUpdate={handleUpdateBlock}
              onRemove={handleRemoveBlock}
              onMove={handleMoveBlock}
            />
          </DndProvider>

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
          {showPalette && mobileTab === 'editor' && (
            <div className="lg:hidden fixed bottom-20 right-4 z-20 w-56 max-h-[60vh] bg-surface-50 border border-surface-200 rounded-xl shadow-lg overflow-y-auto animate-fade-in">
              <BlockPalette onAddBlock={handleAddBlock} />
            </div>
          )}
        </div>

        {/* ── Preview (right on desktop, full on mobile preview tab) ── */}
        <div className={`lg:w-[45%] lg:shrink-0 lg:border-l border-surface-200 overflow-hidden ${
          mobileTab !== 'preview' ? 'hidden lg:block' : 'flex-1'
        }`}>
          <PreviewPane
            blocks={blocks}
            branding={branding}
            settings={settings}
            title={title}
            documentId={documentId}
          />
        </div>
      </div>
    </div>
  )
}
