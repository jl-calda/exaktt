// src/components/doc-builder/BlockPalette.tsx
'use client'
import { BLOCK_REGISTRY, type PaletteCategory } from '@/lib/doc-builder/block-registry'
import type { DocBlock, DocBlockType } from '@/lib/doc-builder/types'
import * as Icons from 'lucide-react'

interface Props {
  onAddBlock: (block: DocBlock) => void
}

const CATEGORY_LABELS: Record<PaletteCategory, string> = {
  layout: 'Layout',
  content: 'Content',
  data: 'Data',
  signature: 'Signature',
}

const CATEGORY_ORDER: PaletteCategory[] = ['layout', 'content', 'data', 'signature']

export default function BlockPalette({ onAddBlock }: Props) {
  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    blocks: BLOCK_REGISTRY.filter(b => b.category === cat),
  })).filter(g => g.blocks.length > 0)

  return (
    <div className="py-2 space-y-3">
      <div className="px-3 text-[10px] font-semibold text-ink-faint uppercase tracking-wider">Blocks</div>

      {grouped.map(group => (
        <div key={group.category}>
          <div className="px-3 text-[9px] font-semibold text-ink-faint uppercase tracking-wider mb-1">
            {group.label}
          </div>
          <div className="px-2 space-y-0.5">
            {group.blocks.map(meta => {
              const Icon = (Icons as any)[meta.icon] ?? Icons.Square
              return (
                <button
                  key={meta.type}
                  onClick={() => onAddBlock(meta.createDefault())}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] text-ink-muted hover:bg-surface-100 hover:text-ink transition-colors text-left"
                  title={meta.description}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                  <span>{meta.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
