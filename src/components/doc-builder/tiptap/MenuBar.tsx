// src/components/doc-builder/tiptap/MenuBar.tsx
'use client'
import type { Editor } from '@tiptap/react'
import {
  Bold, Italic, Underline, Heading1, Heading2, Heading3,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Image,
} from 'lucide-react'

interface Props {
  editor: Editor | null
  onInsertImage?: () => void
}

function Btn({ active, onClick, children, title }: {
  active?: boolean; onClick: () => void; children: React.ReactNode; title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1 rounded transition-colors ${
        active ? 'bg-surface-200 text-ink' : 'text-ink-muted hover:bg-surface-100 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

const FONTS = [
  { label: 'Default', value: '' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Serif', value: 'serif' },
  { label: 'Mono', value: 'monospace' },
]

export default function MenuBar({ editor, onInsertImage }: Props) {
  if (!editor) return null

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b border-surface-200 bg-surface-50 rounded-t-lg flex-wrap">
      <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <Bold className="w-3.5 h-3.5" />
      </Btn>
      <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <Italic className="w-3.5 h-3.5" />
      </Btn>
      <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
        <Underline className="w-3.5 h-3.5" />
      </Btn>

      <div className="w-px h-4 bg-surface-200 mx-1" />

      <Btn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
        <Heading1 className="w-3.5 h-3.5" />
      </Btn>
      <Btn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
        <Heading2 className="w-3.5 h-3.5" />
      </Btn>
      <Btn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
        <Heading3 className="w-3.5 h-3.5" />
      </Btn>

      <div className="w-px h-4 bg-surface-200 mx-1" />

      <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
        <List className="w-3.5 h-3.5" />
      </Btn>
      <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
        <ListOrdered className="w-3.5 h-3.5" />
      </Btn>

      <div className="w-px h-4 bg-surface-200 mx-1" />

      <Btn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left">
        <AlignLeft className="w-3.5 h-3.5" />
      </Btn>
      <Btn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center">
        <AlignCenter className="w-3.5 h-3.5" />
      </Btn>
      <Btn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right">
        <AlignRight className="w-3.5 h-3.5" />
      </Btn>

      <div className="w-px h-4 bg-surface-200 mx-1" />

      <select
        className="text-[10px] px-1.5 py-0.5 border border-surface-200 rounded bg-surface-50 text-ink-muted"
        value={editor.getAttributes('textStyle').fontFamily ?? ''}
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontFamily(e.target.value).run()
          } else {
            editor.chain().focus().unsetFontFamily().run()
          }
        }}
      >
        {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      {onInsertImage && (
        <>
          <div className="w-px h-4 bg-surface-200 mx-1" />
          <Btn onClick={onInsertImage} title="Insert Image">
            <Image className="w-3.5 h-3.5" />
          </Btn>
        </>
      )}
    </div>
  )
}
