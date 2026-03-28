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
    <div className="p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          value={d.label}
          onChange={e => set('label', e.target.value)}
          className="input w-20 text-[10px] font-semibold"
          placeholder="To:"
        />
        <input
          value={d.name}
          onChange={e => set('name', e.target.value)}
          className="input flex-1 text-[11px] font-semibold"
          placeholder="Recipient name"
        />
      </div>
      <input
        value={d.contact ?? ''}
        onChange={e => set('contact', e.target.value)}
        className="input w-full text-[10px]"
        placeholder="Contact person"
      />
      <input
        value={d.email ?? ''}
        onChange={e => set('email', e.target.value)}
        className="input w-full text-[10px]"
        placeholder="Email"
      />
      <input
        value={d.address ?? ''}
        onChange={e => set('address', e.target.value)}
        className="input w-full text-[10px]"
        placeholder="Address"
      />
    </div>
  )
}
