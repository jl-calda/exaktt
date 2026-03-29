// src/components/doc-builder/blocks/MultiColumnBlock.tsx
'use client'
import { useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Upload, Trash2, Loader2, Type, ImageIcon } from 'lucide-react'
import type { DocBlock, ColumnCellContent } from '@/lib/doc-builder/types'
import { editorExtensions } from '../tiptap/extensions'
import MenuBar from '../tiptap/MenuBar'

type Block = Extract<DocBlock, { type: 'multi_column' }>

interface Props {
  block: Block
  onChange: (data: Block['data']) => void
  documentId?: string
}

// ─── Per-Column Text Editor ─────────────────────────────────────────────────

function ColumnTextCell({
  cell,
  index,
  onChange,
  documentId,
}: {
  cell: Extract<ColumnCellContent, { type: 'text' }>
  index: number
  onChange: (content: ColumnCellContent) => void
  documentId?: string
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [focused, setFocused] = useState(false)

  const editor = useEditor({
    extensions: editorExtensions,
    content: cell.tiptapJson,
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onChange({ type: 'text', tiptapJson: editor.getJSON() })
      }, 300)
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  })

  const handleInsertImage = useCallback(async () => {
    if (!editor || !documentId) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch(`/api/documents/${documentId}/upload`, { method: 'POST', body: form })
        const json = await res.json()
        if (json.data?.url) {
          editor.chain().focus().setImage({ src: json.data.url }).run()
        }
      } catch (err) {
        console.error('Image upload failed:', err)
      }
    }
    input.click()
  }, [editor, documentId])

  return (
    <div className="min-h-[40px]">
      {focused && (
        <div className="mb-1 animate-fade-in">
          <MenuBar editor={editor} onInsertImage={documentId ? handleInsertImage : undefined} />
        </div>
      )}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-[24px] text-[12px] leading-relaxed
          [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[24px]
          [&_.ProseMirror_h1]:text-[16px] [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-2 [&_.ProseMirror_h1]:tracking-tight
          [&_.ProseMirror_h2]:text-[14px] [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mb-1.5
          [&_.ProseMirror_h3]:text-[12px] [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mb-1
          [&_.ProseMirror_p]:mb-1 [&_.ProseMirror_p]:text-ink
          [&_.ProseMirror_ul]:pl-4 [&_.ProseMirror_ol]:pl-4
          [&_.ProseMirror_li]:mb-0.5
          [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded"
      />
    </div>
  )
}

// ─── Per-Column Image Cell ──────────────────────────────────────────────────

function ColumnImageCell({
  cell,
  onChange,
  documentId,
}: {
  cell: Extract<ColumnCellContent, { type: 'image' }>
  onChange: (content: ColumnCellContent) => void
  documentId?: string
}) {
  const [uploading, setUploading] = useState(false)

  async function handleUpload() {
    if (!documentId) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setUploading(true)
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`/api/documents/${documentId}/upload`, { method: 'POST', body: form })
        const json = await res.json()
        if (json.data?.url) {
          onChange({ type: 'image', url: json.data.url, caption: cell.caption })
        }
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  if (!cell.url) {
    return (
      <div className="py-6 flex flex-col items-center justify-center text-ink-faint gap-2 border border-dashed border-surface-200 rounded-lg min-h-[80px]">
        <Upload className="w-4 h-4" />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="text-[10px] hover:text-ink transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload image'}
        </button>
      </div>
    )
  }

  return (
    <div className="relative group/colimg">
      <img src={cell.url} alt="" className="w-full object-contain rounded max-h-48" />
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/colimg:opacity-100 transition-opacity">
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="p-1 bg-white/90 rounded-full shadow-sm"
          title="Replace image"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 text-ink-faint" />}
        </button>
        <button
          onClick={() => onChange({ type: 'image', url: '', caption: '' })}
          className="p-1 bg-white/90 rounded-full shadow-sm"
          title="Remove image"
        >
          <Trash2 className="w-3 h-3 text-red-500" />
        </button>
      </div>
      <input
        value={cell.caption ?? ''}
        onChange={e => onChange({ ...cell, caption: e.target.value })}
        className="mt-1 w-full text-[10px] text-ink-faint bg-transparent outline-none text-center
          hover:bg-surface-50 focus:bg-surface-50 rounded px-1 transition-colors"
        placeholder="Caption"
      />
    </div>
  )
}

// ─── Multi Column Block ─────────────────────────────────────────────────────

export default function MultiColumnBlock({ block, onChange, documentId }: Props) {
  const { columns, cells, gap = 16 } = block.data

  function updateCell(index: number, content: ColumnCellContent) {
    const next = [...cells]
    next[index] = content
    onChange({ ...block.data, cells: next })
  }

  function toggleCellType(index: number) {
    const cell = cells[index]
    const next = [...cells]
    if (cell.type === 'text') {
      next[index] = { type: 'image', url: '', caption: '' }
    } else {
      next[index] = { type: 'text', tiptapJson: { type: 'doc', content: [{ type: 'paragraph' }] } }
    }
    onChange({ ...block.data, cells: next })
  }

  function setColumnCount(count: number) {
    const next = [...cells]
    // Add columns
    while (next.length < count) {
      next.push({ type: 'text', tiptapJson: { type: 'doc', content: [{ type: 'paragraph' }] } })
    }
    // Remove extra columns
    if (next.length > count) next.length = count
    onChange({ ...block.data, columns: count, cells: next })
  }

  return (
    <div className="mb-3 group/mcol">
      {/* Column count selector — hover reveal */}
      <div className="flex items-center gap-2 mb-2 opacity-0 group-hover/mcol:opacity-100 transition-opacity">
        <span className="text-[10px] text-ink-faint">Columns:</span>
        {[2, 3, 4].map(n => (
          <button
            key={n}
            onClick={() => setColumnCount(n)}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              columns === n
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-ink-faint hover:text-ink hover:bg-surface-100'
            }`}
          >
            {n}
          </button>
        ))}
        <span className="text-[10px] text-ink-faint ml-2">Gap:</span>
        <select
          value={gap}
          onChange={e => onChange({ ...block.data, gap: Number(e.target.value) })}
          className="text-[10px] px-1 py-0.5 border border-surface-200 rounded bg-surface-50"
        >
          <option value={8}>8px</option>
          <option value={16}>16px</option>
          <option value={24}>24px</option>
          <option value={32}>32px</option>
        </select>
      </div>

      {/* Column grid */}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gap }}>
        {cells.slice(0, columns).map((cell, i) => (
          <div key={i} className="relative group/col min-w-0">
            {/* Type toggle — top-right of each column */}
            <div className="absolute -top-5 right-0 z-10 flex gap-0.5 opacity-0 group-hover/col:opacity-100 transition-opacity">
              <button
                onClick={() => toggleCellType(i)}
                className="text-[10px] text-ink-faint hover:text-ink inline-flex items-center gap-0.5 px-1 py-0.5 hover:bg-surface-100 rounded transition-colors"
                title={cell.type === 'text' ? 'Switch to image' : 'Switch to text'}
              >
                {cell.type === 'text' ? <ImageIcon className="w-3 h-3" /> : <Type className="w-3 h-3" />}
              </button>
            </div>

            {/* Column content */}
            <div className="border border-transparent hover:border-surface-200/60 rounded-lg p-1 transition-colors min-h-[40px]">
              {cell.type === 'text' ? (
                <ColumnTextCell
                  cell={cell}
                  index={i}
                  onChange={content => updateCell(i, content)}
                  documentId={documentId}
                />
              ) : (
                <ColumnImageCell
                  cell={cell}
                  onChange={content => updateCell(i, content)}
                  documentId={documentId}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
