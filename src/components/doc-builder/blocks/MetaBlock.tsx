// src/components/doc-builder/blocks/MetaBlock.tsx
'use client'
import { Plus, Trash2 } from 'lucide-react'
import type { DocBlock } from '@/lib/doc-builder/types'

type Block = Extract<DocBlock, { type: 'meta' }>

interface Props {
  block: Block
  onChange: (data: Block['data']) => void
}

export default function MetaBlock({ block, onChange }: Props) {
  const fields = block.data.fields

  function updateField(idx: number, key: 'label' | 'value', val: string) {
    const next = [...fields]
    next[idx] = { ...next[idx], [key]: val }
    onChange({ fields: next })
  }

  function addField() {
    onChange({ fields: [...fields, { label: '', value: '' }] })
  }

  function removeField(idx: number) {
    onChange({ fields: fields.filter((_, i) => i !== idx) })
  }

  return (
    <div className="flex flex-col items-end mb-4">
      {fields.map((f, i) => (
        <div key={i} className="flex items-center gap-2 group/meta mb-0.5">
          <input
            value={f.label}
            onChange={e => updateField(i, 'label', e.target.value)}
            className="w-24 text-[11px] text-ink-faint bg-transparent outline-none text-right tracking-wide
              hover:bg-surface-50 focus:bg-surface-50 rounded px-1 py-0.5 transition-colors"
            placeholder="Label"
          />
          <input
            value={f.value}
            onChange={e => updateField(i, 'value', e.target.value)}
            className="w-40 text-[11px] text-ink font-semibold bg-transparent outline-none
              hover:bg-surface-50 focus:bg-surface-50 rounded px-1 py-0.5 transition-colors"
            placeholder="Value"
          />
          <button
            onClick={() => removeField(i)}
            className="opacity-0 group-hover/meta:opacity-100 text-ink-faint hover:text-red-500 transition-opacity p-0.5"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
      <button onClick={addField} className="text-[10px] text-ink-faint hover:text-ink mt-1 px-1 py-0.5 hover:bg-surface-50 rounded transition-colors inline-flex items-center gap-1">
        <Plus className="w-2.5 h-2.5" /> Add Field
      </button>
    </div>
  )
}
