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
      <div className="p-4 flex flex-col items-center justify-center text-center gap-2 text-ink-faint">
        <Database className="w-5 h-5" />
        <div className="text-[10px]">No data snapshot loaded</div>
        <input
          value={d.label}
          onChange={e => onChange({ ...d, label: e.target.value })}
          className="input text-[10px] w-48 text-center"
          placeholder="Block label"
        />
      </div>
    )
  }

  // Render snapshot preview
  if (Array.isArray(d.snapshot)) {
    return (
      <div className="p-3 space-y-1">
        <input
          value={d.label}
          onChange={e => onChange({ ...d, label: e.target.value })}
          className="bg-transparent outline-none text-[11px] font-semibold text-ink w-full"
          placeholder="Label"
        />
        <div className="text-[10px] text-ink-muted">
          {d.snapshot.length} items • {d.sourceType}
        </div>
        <div className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
          {d.snapshot.slice(0, 5).map((item: any, i: number) => (
            <div key={i} className="text-[10px] text-ink-muted px-1 py-0.5 bg-surface-50 rounded">
              {item.name ?? item.label ?? JSON.stringify(item).slice(0, 60)}
            </div>
          ))}
          {d.snapshot.length > 5 && (
            <div className="text-[9px] text-ink-faint px-1">+{d.snapshot.length - 5} more</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-1">
      <input
        value={d.label}
        onChange={e => onChange({ ...d, label: e.target.value })}
        className="bg-transparent outline-none text-[11px] font-semibold text-ink w-full"
        placeholder="Label"
      />
      <div className="text-[10px] text-ink-muted">{d.sourceType}</div>
      <pre className="text-[9px] text-ink-faint bg-surface-50 rounded p-2 max-h-32 overflow-y-auto">
        {JSON.stringify(d.snapshot, null, 2)}
      </pre>
    </div>
  )
}
