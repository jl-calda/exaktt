// src/components/doc-builder/EditorPane.tsx
'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import type { DocBlock, DocBranding } from '@/lib/doc-builder/types'
import { BLOCK_MAP } from '@/lib/doc-builder/block-registry'
import * as Icons from 'lucide-react'

// Block editor components
import HeaderBlock from './blocks/HeaderBlock'
import MetaBlock from './blocks/MetaBlock'
import RecipientBlock from './blocks/RecipientBlock'
import RichTextBlock from './blocks/RichTextBlock'
import TableBlock from './blocks/TableBlock'
import ImageBlock from './blocks/ImageBlock'
import SignatureBlock from './blocks/SignatureBlock'
import DataSnapshotBlock from './blocks/DataSnapshotBlock'

interface BlockWrapperProps {
  block: DocBlock
  branding: DocBranding
  documentId?: string
  onUpdate: (id: string, data: any) => void
  onRemove: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  isFirst: boolean
  isLast: boolean
}

function SortableBlockWrapper({ block, branding, documentId, onUpdate, onRemove, onMove, isFirst, isLast }: BlockWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const meta = BLOCK_MAP[block.type]
  const Icon = meta ? (Icons as any)[meta.icon] ?? Icons.Square : Icons.Square

  function renderBlockContent() {
    switch (block.type) {
      case 'header':
        return <HeaderBlock block={block} branding={branding} onChange={d => onUpdate(block.id, d)} />
      case 'meta':
        return <MetaBlock block={block} onChange={d => onUpdate(block.id, d)} />
      case 'recipient':
        return <RecipientBlock block={block} onChange={d => onUpdate(block.id, d)} />
      case 'rich_text':
        return <RichTextBlock block={block} onChange={d => onUpdate(block.id, d)} documentId={documentId} />
      case 'table':
        return <TableBlock block={block} onChange={d => onUpdate(block.id, d)} />
      case 'image':
        return <ImageBlock block={block} onChange={d => onUpdate(block.id, d)} documentId={documentId} />
      case 'signature':
        return <SignatureBlock block={block} onChange={d => onUpdate(block.id, d)} />
      case 'data_snapshot':
        return <DataSnapshotBlock block={block} onChange={d => onUpdate(block.id, d)} />
      case 'spacer':
        return (
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-[10px] text-ink-faint">Spacer</span>
            <input
              type="number"
              value={block.data.height}
              onChange={e => onUpdate(block.id, { height: Number(e.target.value) || 20 })}
              className="input w-16 text-[10px]"
              min={5}
              max={100}
            />
            <span className="text-[10px] text-ink-faint">pt</span>
          </div>
        )
      case 'divider':
        return (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex-1 border-b border-surface-300" />
            <select
              value={block.data.style}
              onChange={e => onUpdate(block.id, { style: e.target.value })}
              className="text-[10px] px-1.5 py-0.5 border border-surface-200 rounded bg-surface-50"
            >
              <option value="line">Thin</option>
              <option value="thick">Thick</option>
              <option value="double">Double</option>
            </select>
          </div>
        )
      case 'footer':
        return (
          <div className="flex items-center gap-3 px-3 py-2 text-[10px] text-ink-muted">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={block.data.showCompanyName} onChange={e => onUpdate(block.id, { ...block.data, showCompanyName: e.target.checked })} className="rounded" />
              Company
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={block.data.showPageNumbers} onChange={e => onUpdate(block.id, { ...block.data, showPageNumbers: e.target.checked })} className="rounded" />
              Page #
            </label>
            <input
              value={block.data.customText ?? ''}
              onChange={e => onUpdate(block.id, { ...block.data, customText: e.target.value })}
              className="flex-1 input text-[10px]"
              placeholder="Custom footer text"
            />
          </div>
        )
      default:
        return <div className="p-3 text-[10px] text-ink-faint">Unknown block type: {(block as any).type}</div>
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="group/block mb-2">
      <div className="border border-surface-200 rounded-lg bg-surface-50 overflow-hidden hover:border-surface-300 transition-colors">
        {/* Block toolbar */}
        <div className="flex items-center gap-0.5 sm:gap-1 px-2 py-1.5 sm:py-1 bg-surface-100/60 border-b border-surface-200/60">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 sm:p-0.5 text-ink-faint hover:text-ink touch-manipulation">
            <GripVertical className="w-4 h-4 sm:w-3 sm:h-3" />
          </button>
          <Icon className="w-3 h-3 text-ink-faint hidden sm:block" strokeWidth={1.8} />
          <span className="text-[10px] font-medium text-ink-muted flex-1 truncate">{meta?.label ?? block.type}</span>
          <button
            onClick={() => onMove(block.id, -1)}
            disabled={isFirst}
            className="p-1 sm:p-0.5 text-ink-faint hover:text-ink disabled:opacity-30 touch-manipulation"
            title="Move up"
          >
            <ChevronUp className="w-4 h-4 sm:w-3 sm:h-3" />
          </button>
          <button
            onClick={() => onMove(block.id, 1)}
            disabled={isLast}
            className="p-1 sm:p-0.5 text-ink-faint hover:text-ink disabled:opacity-30 touch-manipulation"
            title="Move down"
          >
            <ChevronDown className="w-4 h-4 sm:w-3 sm:h-3" />
          </button>
          <button
            onClick={() => onRemove(block.id)}
            className="p-1 sm:p-0.5 text-ink-faint hover:text-red-500 touch-manipulation"
            title="Remove block"
          >
            <Trash2 className="w-4 h-4 sm:w-3 sm:h-3" />
          </button>
        </div>

        {/* Block content */}
        {renderBlockContent()}
      </div>
    </div>
  )
}

interface EditorPaneProps {
  blocks: DocBlock[]
  branding: DocBranding
  documentId?: string
  onUpdate: (id: string, data: any) => void
  onRemove: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
}

export default function EditorPane({ blocks, branding, documentId, onUpdate, onRemove, onMove }: EditorPaneProps) {
  if (blocks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-faint text-[11px] py-12">
        Drag blocks from the palette or click to add
      </div>
    )
  }

  return (
    <div className="flex-1 p-3 overflow-y-auto">
      {blocks.map((block, i) => (
        <SortableBlockWrapper
          key={block.id}
          block={block}
          branding={branding}
          documentId={documentId}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onMove={onMove}
          isFirst={i === 0}
          isLast={i === blocks.length - 1}
        />
      ))}
    </div>
  )
}
