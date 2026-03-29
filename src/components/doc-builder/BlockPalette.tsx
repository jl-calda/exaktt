// src/components/doc-builder/BlockPalette.tsx
'use client'
import { useState } from 'react'
import { BLOCK_REGISTRY, type PaletteCategory } from '@/lib/doc-builder/block-registry'
import type { DocBlock, DocBlockType, DocEstimate } from '@/lib/doc-builder/types'
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
  estimates?: DocEstimate[]
  onInsertEstimate?: (est: DocEstimate, mode: 'summary' | 'breakdown') => void
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

export default function BlockPalette({ onAddBlock, templates, estimates, onInsertEstimate }: Props) {
  const [expandedEstimate, setExpandedEstimate] = useState<string | null>(null)
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
      {/* Estimates section */}
      {estimates && estimates.length > 0 && (
        <div>
          <div className="px-3 text-[9px] font-semibold text-ink-faint uppercase tracking-wider mb-1.5">
            Estimates
          </div>
          <div className="px-2 space-y-1">
            {estimates.map(est => {
              const snap = est.resultSnapshot
              const totals = snap?.totals
              const bom = snap?.bom ?? []
              const runs = snap?.runs ?? []
              const expanded = expandedEstimate === est.id

              return (
                <div key={est.id} className="rounded-lg border border-surface-200/60 overflow-hidden">
                  {/* Estimate header — click to expand */}
                  <button
                    onClick={() => setExpandedEstimate(expanded ? null : est.id)}
                    className="w-full text-left px-2.5 py-2 hover:bg-surface-100 transition-colors"
                  >
                    <div className="text-[11px] font-medium text-ink truncate">{est.systemName}</div>
                    <div className="text-[10px] text-ink-faint truncate">{est.jobName}</div>
                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      {runs.length > 0 && (
                        <span className="text-ink-faint">{runs.length} run{runs.length !== 1 ? 's' : ''}</span>
                      )}
                      <span className="font-mono font-medium text-ink">
                        {(est.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="border-t border-surface-200/60 bg-surface-50 px-2.5 py-2 space-y-2 animate-fade-in">
                      {/* Cost breakdown */}
                      {totals && (
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-ink-faint">Material</span>
                            <span className="font-mono text-ink">{totals.materialCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          {totals.labourCost > 0 && (
                            <div className="flex justify-between text-[10px]">
                              <span className="text-ink-faint">Labour</span>
                              <span className="font-mono text-ink">{totals.labourCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {totals.thirdPartyCost > 0 && (
                            <div className="flex justify-between text-[10px]">
                              <span className="text-ink-faint">Third Party</span>
                              <span className="font-mono text-ink">{totals.thirdPartyCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[10px] font-semibold border-t border-surface-200 pt-0.5">
                            <span className="text-ink">Grand Total</span>
                            <span className="font-mono text-ink">{totals.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      )}

                      {/* BOM summary */}
                      {bom.length > 0 && (
                        <div>
                          <div className="text-[9px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Materials ({bom.length})</div>
                          <div className="max-h-32 overflow-y-auto space-y-0.5">
                            {bom.map((m: any) => (
                              <div key={m.id} className="flex items-center justify-between text-[10px]">
                                <span className="text-ink truncate flex-1 mr-2">{m.name}</span>
                                <span className="text-ink-faint font-mono shrink-0">{m.grandTotal} {m.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {onInsertEstimate && (
                        <div className="flex gap-1.5 pt-1">
                          <button
                            onClick={() => onInsertEstimate(est, 'summary')}
                            className="flex-1 text-[10px] font-medium text-ink-muted hover:text-ink px-2 py-1.5 rounded-md bg-surface-100 hover:bg-surface-200 transition-colors"
                          >
                            Add Summary
                          </button>
                          <button
                            onClick={() => onInsertEstimate(est, 'breakdown')}
                            className="flex-1 text-[10px] font-medium text-primary hover:text-primary/80 px-2 py-1.5 rounded-md bg-primary/5 hover:bg-primary/10 transition-colors"
                          >
                            Add Breakdown
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
