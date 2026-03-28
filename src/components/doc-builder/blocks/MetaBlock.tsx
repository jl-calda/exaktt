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
    <div className="p-3 space-y-1">
      {fields.map((f, i) => (
        <div key={i} className="flex items-center gap-2 group/meta">
          <input
            value={f.label}
            onChange={e => updateField(i, 'label', e.target.value)}
            className="w-28 text-[10px] text-ink-faint bg-transparent outline-none text-right font-medium"
            placeholder="Label"
          />
          <input
            value={f.value}
            onChange={e => updateField(i, 'value', e.target.value)}
            className="flex-1 text-[10px] text-ink font-semibold bg-transparent outline-none"
            placeholder="Value"
          />
          <button
            onClick={() => removeField(i)}
            className="opacity-0 group-hover/meta:opacity-100 text-ink-faint hover:text-red-500 transition-opacity"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
      <button onClick={addField} className="btn-ghost text-[10px] inline-flex items-center gap-1 px-2 py-0.5 mt-1">
        <Plus className="w-3 h-3" /> Add Field
      </button>
    </div>
  )
}
