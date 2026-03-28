// src/components/doc-builder/DocBuilder.tsx
'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Save, Loader2, FileText } from 'lucide-react'
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
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Mark dirty on any change
  useEffect(() => {
    setDirty(true)
  }, [blocks, title, ref, status])

  // Auto-save (debounced)
  useEffect(() => {
    if (!dirty || !onSave || !documentId) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      try {
        await onSave({ title, ref: ref || null, status, blocks })
        setDirty(false)
      } catch {}
    }, 2000)
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [blocks, title, ref, status, dirty, onSave, documentId])

  function handleAddBlock(block: DocBlock) {
    setBlocks(prev => [...prev, block])
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
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-surface-200 bg-surface-50 shrink-0">
        <FileText className="w-4 h-4 text-ink-faint" />
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="text-sm font-semibold text-ink bg-transparent outline-none flex-1 min-w-0"
          placeholder="Document title"
        />
        <input
          value={ref}
          onChange={e => setRef(e.target.value)}
          className="input text-[10px] w-32"
          placeholder="Reference"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="text-[10px] px-2 py-1 border border-surface-200 rounded bg-surface-50"
        >
          <option value="draft">Draft</option>
          <option value="final">Final</option>
        </select>
        {dirty && <span className="text-[9px] text-ink-faint">Unsaved</span>}
        {onSave && (
          <button
            onClick={handleManualSave}
            disabled={saving}
            className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
        )}
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Block Palette */}
        <aside className="w-48 shrink-0 border-r border-surface-200 bg-surface-50 overflow-y-auto">
          <BlockPalette onAddBlock={handleAddBlock} />
        </aside>

        {/* Center: Editor */}
        <div className="flex-1 overflow-y-auto bg-surface-100/30">
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
        </div>

        {/* Right: Preview */}
        <div className="w-[45%] shrink-0 border-l border-surface-200 overflow-hidden">
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
