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
    <div className="flex justify-between mt-8 mb-4 px-3 gap-12">
      {/* Left signature */}
      <div className="w-[42%]">
        <div className="h-10 border-b border-ink mb-1" />
        <input
          value={d.leftLabel}
          onChange={e => onChange({ ...d, leftLabel: e.target.value })}
          className="bg-transparent outline-none text-[11px] text-ink-muted w-full
            hover:bg-surface-50 focus:bg-surface-50 rounded px-0.5 transition-colors"
          placeholder="Label"
        />
        {d.showDate && (
          <div className="text-[10px] text-ink-faint mt-2">Date: _______________</div>
        )}
      </div>

      {/* Right signature */}
      <div className="w-[42%]">
        <div className="h-10 border-b border-ink mb-1" />
        <input
          value={d.rightLabel}
          onChange={e => onChange({ ...d, rightLabel: e.target.value })}
          className="bg-transparent outline-none text-[11px] text-ink-muted w-full
            hover:bg-surface-50 focus:bg-surface-50 rounded px-0.5 transition-colors"
          placeholder="Label"
        />
        {d.showDate && (
          <div className="text-[10px] text-ink-faint mt-2">Date: _______________</div>
        )}
      </div>
    </div>
  )
}
