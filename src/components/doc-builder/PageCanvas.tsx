// src/components/doc-builder/PageCanvas.tsx
'use client'
import React from 'react'
import type { DocBlock, DocBranding, DocSettings } from '@/lib/doc-builder/types'
import DndProvider from './dnd/DndProvider'
import CanvasBlock from './CanvasBlock'

export const PAGE_SIZES = {
  A4:     { width: 794, height: 1123, label: 'A4' },
  LETTER: { width: 816, height: 1056, label: 'Letter' },
  LEGAL:  { width: 816, height: 1344, label: 'Legal' },
} as const

export type PageSizeKey = keyof typeof PAGE_SIZES

interface Props {
  blocks: DocBlock[]
  branding: DocBranding
  settings?: DocSettings | null
  documentId?: string
  pageSize: PageSizeKey
  zoom: number
  onUpdate: (id: string, data: any) => void
  onRemove: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onReorder: (activeId: string, overId: string) => void
  onInsertBlock?: (block: DocBlock, afterId?: string) => void
}

export default function PageCanvas({
  blocks, branding, settings, documentId, pageSize, zoom,
  onUpdate, onRemove, onMove, onReorder, onInsertBlock,
}: Props) {
  const size = PAGE_SIZES[pageSize]
  const blockIds = blocks.map(b => b.id)

  // Calculate approximate page count
  const contentHeight = size.height - 76 // subtract top/bottom padding (28pt + 48pt)

  return (
    <div className="flex-1 overflow-y-auto bg-surface-100/50 py-6 lg:py-8">
      <div className="flex justify-center px-4">
        <div
          className="bg-white rounded-sm relative"
          style={{
            width: size.width * (zoom / 100),
            minHeight: size.height * (zoom / 100),
            padding: `${28 * (zoom / 100)}px ${32 * (zoom / 100)}px ${48 * (zoom / 100)}px`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)',
            transformOrigin: 'top center',
          }}
        >
          <DndProvider items={blockIds} onReorder={onReorder}>
            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-ink-faint py-24 gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <div className="text-[12px]">Add blocks from the sidebar to build your document</div>
              </div>
            ) : (
              blocks.map((block, i) => (
                <CanvasBlock
                  key={block.id}
                  block={block}
                  branding={branding}
                  documentId={documentId}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  onMove={onMove}
                  isFirst={i === 0}
                  isLast={i === blocks.length - 1}
                  zoom={zoom}
                />
              ))
            )}
          </DndProvider>

          {/* Page break indicators */}
          {blocks.length > 0 && Array.from({ length: 5 }, (_, i) => {
            const pageTop = (i + 1) * contentHeight
            return (
              <div
                key={i}
                className="absolute left-0 right-0 pointer-events-none"
                style={{ top: pageTop * (zoom / 100) + 28 * (zoom / 100) }}
              >
                <div className="border-t border-dashed border-surface-300/60 mx-4" />
                <div className="absolute -top-2.5 right-6 text-[10px] text-ink-faint bg-white px-1.5">
                  Page {i + 2}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom padding for scrolling */}
      <div className="h-12" />
    </div>
  )
}
