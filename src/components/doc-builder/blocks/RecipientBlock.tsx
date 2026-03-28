// src/components/doc-builder/blocks/RecipientBlock.tsx
'use client'
import type { DocBlock } from '@/lib/doc-builder/types'

type Block = Extract<DocBlock, { type: 'recipient' }>

interface Props {
  block: Block
  onChange: (data: Block['data']) => void
}

export default function RecipientBlock({ block, onChange }: Props) {
  const d = block.data
  const set = (key: keyof Block['data'], val: string) => onChange({ ...d, [key]: val })

  return (
    <div className="border-l-[3px] border-primary bg-surface-50/50 rounded-r-lg px-4 py-3 mb-4">
      <input
        value={d.label}
        onChange={e => set('label', e.target.value)}
        className="text-[10px] text-ink-faint font-medium bg-transparent outline-none mb-1 block
          hover:bg-white/60 focus:bg-white/60 rounded px-0.5 transition-colors tracking-wide uppercase"
        placeholder="To:"
      />
      <input
        value={d.name}
        onChange={e => set('name', e.target.value)}
        className="text-[14px] font-bold text-ink bg-transparent outline-none w-full mb-1
          hover:bg-white/60 focus:bg-white/60 rounded px-0.5 transition-colors"
        placeholder="Recipient name"
      />
      <input
        value={d.contact ?? ''}
        onChange={e => set('contact', e.target.value)}
        className="text-[11px] text-ink-muted bg-transparent outline-none w-full leading-relaxed
          hover:bg-white/60 focus:bg-white/60 rounded px-0.5 transition-colors"
        placeholder="Contact person"
      />
      <input
        value={d.email ?? ''}
        onChange={e => set('email', e.target.value)}
        className="text-[11px] text-ink-muted bg-transparent outline-none w-full leading-relaxed
          hover:bg-white/60 focus:bg-white/60 rounded px-0.5 transition-colors"
        placeholder="Email"
      />
      <input
        value={d.address ?? ''}
        onChange={e => set('address', e.target.value)}
        className="text-[11px] text-ink-muted bg-transparent outline-none w-full leading-relaxed
          hover:bg-white/60 focus:bg-white/60 rounded px-0.5 transition-colors"
        placeholder="Address"
      />
    </div>
  )
}
