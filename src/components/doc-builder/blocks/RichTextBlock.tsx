// src/components/doc-builder/blocks/RichTextBlock.tsx
'use client'
import { useCallback, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { DocBlock } from '@/lib/doc-builder/types'
import { editorExtensions } from '../tiptap/extensions'
import MenuBar from '../tiptap/MenuBar'

type Block = Extract<DocBlock, { type: 'rich_text' }>

interface Props {
  block: Block
  onChange: (data: Block['data']) => void
  documentId?: string
}

export default function RichTextBlock({ block, onChange, documentId }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [focused, setFocused] = useState(false)

  const editor = useEditor({
    extensions: editorExtensions,
    content: block.data.tiptapJson,
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onChange({ tiptapJson: editor.getJSON() })
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
    <div className="mb-3">
      {/* Floating toolbar — appears on focus */}
      {focused && (
        <div className="mb-1 animate-fade-in">
          <MenuBar editor={editor} onInsertImage={documentId ? handleInsertImage : undefined} />
        </div>
      )}

      {/* Editor content — document-sized typography, no border */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-[24px] text-[13px] leading-relaxed
          [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[24px]
          [&_.ProseMirror_h1]:text-[18px] [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-2 [&_.ProseMirror_h1]:tracking-tight
          [&_.ProseMirror_h2]:text-[15px] [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mb-1.5
          [&_.ProseMirror_h3]:text-[13px] [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mb-1
          [&_.ProseMirror_p]:mb-1.5 [&_.ProseMirror_p]:text-ink
          [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:pl-5
          [&_.ProseMirror_li]:mb-0.5
          [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded"
      />
    </div>
  )
}
