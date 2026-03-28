// src/components/doc-builder/blocks/DataSnapshotBlock.tsx
'use client'
import { Database } from 'lucide-react'
import type { DocBlock } from '@/lib/doc-builder/types'

type Block = Extract<DocBlock, { type: 'data_snapshot' }>

interface Props {
  block: Block
  onChange: (data: Block['data']) => void
}

export default function DataSnapshotBlock({ block, onChange }: Props) {
  const d = block.data

  if (!d.snapshot) {
    return (
      <div className="py-6 flex flex-col items-center justify-center text-center text-ink-faint gap-2 border border-dashed border-surface-200 rounded-lg mb-4">
        <Database className="w-5 h-5" />
        <div className="text-[11px]">No data snapshot loaded</div>
        <input
          value={d.label}
          onChange={e => onChange({ ...d, label: e.target.value })}
          className="text-[11px] text-center bg-transparent outline-none hover:bg-surface-50 focus:bg-surface-50 rounded px-2 py-0.5 transition-colors w-48"
          placeholder="Block label"
        />
      </div>
    )
  }

  // Render as document-style data section
  if (Array.isArray(d.snapshot)) {
    return (
      <div className="mb-4">
        <input
          value={d.label}
          onChange={e => onChange({ ...d, label: e.target.value })}
          className="text-[13px] font-bold text-ink bg-transparent outline-none w-full mb-2
            hover:bg-surface-50 focus:bg-surface-50 rounded px-0.5 transition-colors"
          placeholder="Label"
        />
        <div className="space-y-0">
          {d.snapshot.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-surface-200/60 text-[11px]">
              <span className="text-ink">{item.name ?? item.label ?? JSON.stringify(item).slice(0, 60)}</span>
              {item.value != null && <span className="text-ink-muted">{String(item.value)}</span>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Object — render as key-value pairs
  return (
    <div className="mb-4">
      <input
        value={d.label}
        onChange={e => onChange({ ...d, label: e.target.value })}
        className="text-[13px] font-bold text-ink bg-transparent outline-none w-full mb-2
          hover:bg-surface-50 focus:bg-surface-50 rounded px-0.5 transition-colors"
        placeholder="Label"
      />
      <div className="space-y-0">
        {Object.entries(d.snapshot).map(([key, val], i) => (
          <div key={i} className="flex py-1 text-[11px]">
            <span className="w-28 text-ink-faint shrink-0">{key}</span>
            <span className="text-ink">{String(val)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
