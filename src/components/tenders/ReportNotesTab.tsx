// src/components/tenders/ReportNotesTab.tsx
'use client'
import { useState, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { StickyNote, Save, Loader2 } from 'lucide-react'
import { editorExtensions } from '@/components/doc-builder/tiptap/extensions'
import MenuBar from '@/components/doc-builder/tiptap/MenuBar'

interface Props {
  reportId: string
  tenderId: string
  initialNotes: string | null
}

export default function ReportNotesTab({ reportId, tenderId, initialNotes }: Props) {
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const saveNotes = useCallback(async (content: any) => {
    setSaving(true)
    try {
      await fetch(`/api/tenders/${tenderId}/report`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, notes: JSON.stringify(content) }),
      })
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }, [reportId, tenderId])

  const editor = useEditor({
    extensions: editorExtensions,
    content: initialNotes ? JSON.parse(initialNotes) : { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor }) => {
      setDirty(true)
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
      autoSaveRef.current = setTimeout(() => {
        saveNotes(editor.getJSON())
      }, 2000)
    },
  })

  const handleManualSave = () => {
    if (!editor) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    saveNotes(editor.getJSON())
  }

  return (
    <div className="min-h-full px-4 py-4 md:px-6 md:py-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-ink-faint" />
            Internal Notes
          </h3>
          <p className="text-[11px] text-ink-faint mt-0.5">
            Notes are for internal use only — they will not appear in the PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-[10px] text-ink-faint">Unsaved</span>}
          <button
            onClick={handleManualSave}
            disabled={saving || !dirty}
            className="btn-primary text-[11px] inline-flex items-center gap-1"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>

      <div className="card p-4">
        {/* Toolbar */}
        <div className="mb-2 border-b border-surface-200 pb-2">
          <MenuBar editor={editor} />
        </div>

        {/* Editor */}
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none min-h-[300px] text-[13px] leading-relaxed
            [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[300px]
            [&_.ProseMirror_h1]:text-[18px] [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-2 [&_.ProseMirror_h1]:tracking-tight
            [&_.ProseMirror_h2]:text-[15px] [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mb-1.5
            [&_.ProseMirror_h3]:text-[13px] [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mb-1
            [&_.ProseMirror_p]:mb-1.5 [&_.ProseMirror_p]:text-ink
            [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:pl-5
            [&_.ProseMirror_li]:mb-0.5"
        />
      </div>
    </div>
  )
}
