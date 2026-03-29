// src/components/doc-builder/BlockPalette.tsx
'use client'
import { BLOCK_REGISTRY, type PaletteCategory } from '@/lib/doc-builder/block-registry'
import type { DocBlock, DocBlockType } from '@/lib/doc-builder/types'
import * as Icons from 'lucide-react'

export interface TemplateBlock {
  id: string
  name: string
  category: string
  blockTitle?: string
  blockContent?: string
}

interface Props {
  onAddBlock: (block: DocBlock) => void
  templates?: TemplateBlock[]
}

const CATEGORY_LABELS: Record<PaletteCategory, string> = {
  layout: 'Layout',
  content: 'Content',
  data: 'Data',
  signature: 'Signature',
}

const CATEGORY_ORDER: PaletteCategory[] = ['layout', 'content', 'data', 'signature']

let _tplCounter = 0
function tplUid() { _tplCounter += 1; return `tpl_${Date.now()}_${_tplCounter}` }

export default function BlockPalette({ onAddBlock, templates }: Props) {
  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    blocks: BLOCK_REGISTRY.filter(b => b.category === cat),
  })).filter(g => g.blocks.length > 0)

  return (
    <div className="py-3 space-y-3">
      <div className="px-3 text-[10px] font-semibold text-ink-faint uppercase tracking-wider">Add Block</div>

      {grouped.map(group => (
        <div key={group.category}>
          <div className="px-3 text-[9px] font-semibold text-ink-faint uppercase tracking-wider mb-1.5">
            {group.label}
          </div>
          <div className="px-2 space-y-0.5">
            {group.blocks.map(meta => {
              const Icon = (Icons as any)[meta.icon] ?? Icons.Square
              return (
                <button
                  key={meta.type}
                  onClick={() => onAddBlock(meta.createDefault())}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-[10px] text-ink-muted hover:bg-surface-100 active:bg-surface-200 hover:text-ink transition-colors text-left touch-manipulation"
                  title={meta.description}
                >
                  <Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" strokeWidth={1.8} />
                  <div className="min-w-0">
                    <div className="font-medium">{meta.label}</div>
                    <div className="text-[9px] text-ink-faint truncate sm:hidden">{meta.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Templates section */}
      {templates && templates.length > 0 && (
        <div>
          <div className="px-3 text-[9px] font-semibold text-ink-faint uppercase tracking-wider mb-1.5">
            Templates
          </div>
          <div className="px-2 space-y-0.5">
            {templates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => onAddBlock({
                  type: 'rich_text',
                  id: tplUid(),
                  data: {
                    tiptapJson: {
                      type: 'doc',
                      content: [
                        ...(tpl.blockTitle ? [{ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: tpl.blockTitle }] }] : []),
                        ...(tpl.blockContent ? [{ type: 'paragraph', content: [{ type: 'text', text: tpl.blockContent }] }] : [{ type: 'paragraph' }]),
                      ],
                    },
                  },
                })}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-[10px] text-ink-muted hover:bg-surface-100 active:bg-surface-200 hover:text-ink transition-colors text-left touch-manipulation"
                title={tpl.blockContent ? tpl.blockContent.slice(0, 80) : tpl.name}
              >
                <Icons.BookTemplate className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" strokeWidth={1.8} />
                <div className="min-w-0">
                  <div className="font-medium">{tpl.name}</div>
                  <div className="text-[9px] text-ink-faint truncate">{tpl.category}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
