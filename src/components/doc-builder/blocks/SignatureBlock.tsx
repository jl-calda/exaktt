// src/components/doc-builder/blocks/SignatureBlock.tsx
'use client'
import type { DocBlock } from '@/lib/doc-builder/types'

type Block = Extract<DocBlock, { type: 'signature' }>

interface Props {
  block: Block
  onChange: (data: Block['data']) => void
}

export default function SignatureBlock({ block, onChange }: Props) {
  const d = block.data

  return (
    <div className="p-3">
      <div className="flex gap-8">
        <div className="flex-1 space-y-1">
          <div className="h-8 border-b border-ink/30" />
          <input
            value={d.leftLabel}
            onChange={e => onChange({ ...d, leftLabel: e.target.value })}
            className="bg-transparent outline-none text-[10px] text-ink-muted w-full"
            placeholder="Left label"
          />
          {d.showDate && <div className="text-[9px] text-ink-faint">Date: _______________</div>}
        </div>
        <div className="flex-1 space-y-1">
          <div className="h-8 border-b border-ink/30" />
          <input
            value={d.rightLabel}
            onChange={e => onChange({ ...d, rightLabel: e.target.value })}
            className="bg-transparent outline-none text-[10px] text-ink-muted w-full"
            placeholder="Right label"
          />
          {d.showDate && <div className="text-[9px] text-ink-faint">Date: _______________</div>}
        </div>
      </div>
      <label className="flex items-center gap-1.5 text-[10px] text-ink-muted mt-2">
        <input type="checkbox" checked={d.showDate} onChange={e => onChange({ ...d, showDate: e.target.checked })} className="rounded" />
        Show date lines
      </label>
    </div>
  )
}
