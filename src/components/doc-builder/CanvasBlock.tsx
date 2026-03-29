// src/components/doc-builder/CanvasBlock.tsx
'use client'
import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, ChevronUp, ChevronDown, Settings } from 'lucide-react'
import type { DocBlock, DocBranding, DocEstimate } from '@/lib/doc-builder/types'
import { BLOCK_MAP } from '@/lib/doc-builder/block-registry'

// Block editor components
import HeaderBlock from './blocks/HeaderBlock'
import MetaBlock from './blocks/MetaBlock'
import RecipientBlock from './blocks/RecipientBlock'
import RichTextBlock from './blocks/RichTextBlock'
import TableBlock from './blocks/TableBlock'
import ImageBlock from './blocks/ImageBlock'
import SignatureBlock from './blocks/SignatureBlock'
import DataSnapshotBlock from './blocks/DataSnapshotBlock'
import SpreadsheetBlock from './blocks/SpreadsheetBlock'

interface Props {
  block: DocBlock
  branding: DocBranding
  documentId?: string
  estimates?: DocEstimate[]
  onUpdate: (id: string, data: any) => void
  onRemove: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  isFirst: boolean
  isLast: boolean
  zoom: number
}

export default function CanvasBlock({ block, branding, documentId, estimates, onUpdate, onRemove, onMove, isFirst, isLast, zoom }: Props) {
  const [showSettings, setShowSettings] = useState(false)
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
    opacity: isDragging ? 0.4 : 1,
  }

  const meta = BLOCK_MAP[block.type]

  // Settings content for blocks that have toggleable options
  function renderSettings() {
    switch (block.type) {
      case 'header':
        return (
          <div className="flex flex-wrap gap-3 p-2 text-[10px] text-ink-muted">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={block.data.showLogo} onChange={e => onUpdate(block.id, { ...block.data, showLogo: e.target.checked })} className="rounded" />
              Logo
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={block.data.showRegistration} onChange={e => onUpdate(block.id, { ...block.data, showRegistration: e.target.checked })} className="rounded" />
              Registration
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={block.data.showContact} onChange={e => onUpdate(block.id, { ...block.data, showContact: e.target.checked })} className="rounded" />
              Contact
            </label>
          </div>
        )
      case 'signature':
        return (
          <div className="p-2 text-[10px] text-ink-muted">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={block.data.showDate} onChange={e => onUpdate(block.id, { ...block.data, showDate: e.target.checked })} className="rounded" />
              Show date lines
            </label>
          </div>
        )
      case 'table':
        return (
          <div className="p-2 text-[10px] text-ink-muted">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={block.data.showTotals} onChange={e => onUpdate(block.id, { ...block.data, showTotals: e.target.checked })} className="rounded" />
              Show Totals
            </label>
          </div>
        )
      case 'footer':
        return (
          <div className="flex flex-wrap gap-3 p-2 text-[10px] text-ink-muted">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={block.data.showCompanyName} onChange={e => onUpdate(block.id, { ...block.data, showCompanyName: e.target.checked })} className="rounded" />
              Company
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={block.data.showPageNumbers} onChange={e => onUpdate(block.id, { ...block.data, showPageNumbers: e.target.checked })} className="rounded" />
              Page #
            </label>
            <input
              value={block.data.customText ?? ''}
              onChange={e => onUpdate(block.id, { ...block.data, customText: e.target.value })}
              className="input text-[10px] flex-1 min-w-[120px]"
              placeholder="Custom footer text"
            />
          </div>
        )
      case 'image':
        return (
          <div className="p-2 text-[10px] text-ink-muted">
            <label className="flex items-center gap-2">
              Columns:
              <select
                value={block.data.columns}
                onChange={e => onUpdate(block.id, { ...block.data, columns: Number(e.target.value) })}
                className="text-[10px] px-1.5 py-0.5 border border-surface-200 rounded bg-surface-50"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </label>
          </div>
        )
      default:
        return null
    }
  }

  const hasSettings = ['header', 'signature', 'table', 'footer', 'image'].includes(block.type)
  const settingsContent = showSettings ? renderSettings() : null

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
        return <TableBlock block={block} onChange={d => onUpdate(block.id, d)} estimates={estimates} />
      case 'image':
        return <ImageBlock block={block} onChange={d => onUpdate(block.id, d)} documentId={documentId} />
      case 'signature':
        return <SignatureBlock block={block} onChange={d => onUpdate(block.id, d)} />
      case 'data_snapshot':
        return <DataSnapshotBlock block={block} onChange={d => onUpdate(block.id, d)} />
      case 'spreadsheet':
        return <SpreadsheetBlock block={block} onChange={d => onUpdate(block.id, d)} />
      case 'spacer':
        return <div style={{ height: block.data.height }} className="group/spacer relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/spacer:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 text-[10px] text-ink-faint bg-white/90 px-2 py-0.5 rounded border border-surface-200">
              <span>Spacer</span>
              <input
                type="number"
                value={block.data.height}
                onChange={e => onUpdate(block.id, { height: Number(e.target.value) || 20 })}
                className="w-12 text-[10px] px-1 py-0.5 border border-surface-200 rounded bg-white"
                min={5}
                max={100}
              />
              <span>pt</span>
            </div>
          </div>
        </div>
      case 'divider': {
        const dividerStyles = {
          line: 'border-b border-surface-300',
          thick: 'border-b-2 border-surface-400',
          double: 'border-b border-surface-300 pb-1 mb-1',
        }
        return (
          <div className="group/divider relative py-2">
            <div className={dividerStyles[block.data.style] ?? dividerStyles.line} />
            {block.data.style === 'double' && <div className="border-b border-surface-300 mt-1" />}
            <div className="absolute right-0 top-0 opacity-0 group-hover/divider:opacity-100 transition-opacity">
              <select
                value={block.data.style}
                onChange={e => onUpdate(block.id, { style: e.target.value })}
                className="text-[10px] px-1 py-0.5 border border-surface-200 rounded bg-white"
              >
                <option value="line">Thin</option>
                <option value="thick">Thick</option>
                <option value="double">Double</option>
              </select>
            </div>
          </div>
        )
      }
      case 'page_break':
        return (
          <div className="py-4 flex items-center gap-3">
            <div className="flex-1 border-t-2 border-dashed border-surface-300" />
            <span className="text-[10px] text-ink-faint font-medium uppercase tracking-wider">Page Break</span>
            <div className="flex-1 border-t-2 border-dashed border-surface-300" />
          </div>
        )
      case 'footer':
        return (
          <div className="flex items-center justify-between py-2 border-t border-surface-200 text-[10px] text-ink-faint">
            <span>{block.data.showCompanyName ? (branding.companyName ?? 'Company') : (block.data.customText ?? '')}</span>
            {block.data.showPageNumbers && <span>Page 1 of 1</span>}
          </div>
        )
      default:
        return <div className="py-2 text-[10px] text-ink-faint">Unknown block: {(block as any).type}</div>
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="group/block relative">
      {/* Hover gutter — drag handle + actions */}
      <div className="absolute -left-10 top-0 bottom-0 w-9 flex flex-col items-center pt-1 gap-0.5
        opacity-100 sm:opacity-0 sm:group-hover/block:opacity-100 transition-opacity">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-ink-faint hover:text-ink rounded hover:bg-surface-100 touch-manipulation"
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onMove(block.id, -1)}
          disabled={isFirst}
          className="p-0.5 text-ink-faint hover:text-ink disabled:opacity-20 rounded hover:bg-surface-100 touch-manipulation"
          title="Move up"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={() => onMove(block.id, 1)}
          disabled={isLast}
          className="p-0.5 text-ink-faint hover:text-ink disabled:opacity-20 rounded hover:bg-surface-100 touch-manipulation"
          title="Move down"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
        {hasSettings && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-0.5 rounded hover:bg-surface-100 touch-manipulation ${showSettings ? 'text-primary' : 'text-ink-faint hover:text-ink'}`}
            title="Block settings"
          >
            <Settings className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={() => onRemove(block.id)}
          className="p-0.5 text-ink-faint hover:text-red-500 rounded hover:bg-red-50 touch-manipulation"
          title="Remove block"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Block content — no card chrome, renders directly on white page */}
      <div className="relative rounded-lg transition-all
        hover:ring-1 hover:ring-surface-200/60
        focus-within:ring-1 focus-within:ring-primary/20">
        {renderBlockContent()}
      </div>

      {/* Settings popover */}
      {settingsContent && (
        <div className="border border-surface-200 rounded-lg bg-surface-50 mt-1 animate-fade-in">
          {settingsContent}
        </div>
      )}
    </div>
  )
}
