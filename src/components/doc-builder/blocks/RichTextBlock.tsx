// src/components/doc-builder/blocks/RichTextBlock.tsx
'use client'
import { useCallback, useRef } from 'react'
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

  const editor = useEditor({
    extensions: editorExtensions,
    content: block.data.tiptapJson,
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onChange({ tiptapJson: editor.getJSON() })
      }, 300)
    },
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
    <div className="border border-surface-200 rounded-lg overflow-hidden">
      <MenuBar editor={editor} onInsertImage={documentId ? handleInsertImage : undefined} />
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2 min-h-[60px] text-xs [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[40px]"
      />
    </div>
  )
}
