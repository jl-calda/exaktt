// src/components/doc-builder/blocks/TableBlock.tsx
'use client'
import { Plus, Trash2 } from 'lucide-react'
import type { DocBlock, TableColumn } from '@/lib/doc-builder/types'

type Block = Extract<DocBlock, { type: 'table' }>

interface Props {
  block: Block
  onChange: (data: Block['data']) => void
}

export default function TableBlock({ block, onChange }: Props) {
  const { columns, rows, showTotals, totalLabel, currency } = block.data

  function updateRow(idx: number, key: string, value: string) {
    const next = [...rows]
    next[idx] = { ...next[idx], [key]: value }
    onChange({ ...block.data, rows: next })
  }

  function addRow() {
    const empty: Record<string, any> = {}
    columns.forEach(c => { empty[c.key] = '' })
    onChange({ ...block.data, rows: [...rows, empty] })
  }

  function removeRow(idx: number) {
    onChange({ ...block.data, rows: rows.filter((_, i) => i !== idx) })
  }

  function updateColumn(idx: number, field: keyof TableColumn, value: string) {
    const next = [...columns]
    next[idx] = { ...next[idx], [field]: value }
    onChange({ ...block.data, columns: next })
  }

  function addColumn() {
    const key = `col_${columns.length}`
    onChange({ ...block.data, columns: [...columns, { key, label: 'New Column', align: 'left' }] })
  }

  function removeColumn(idx: number) {
    const col = columns[idx]
    onChange({
      ...block.data,
      columns: columns.filter((_, i) => i !== idx),
      rows: rows.map(r => {
        const next = { ...r }
        delete next[col.key]
        return next
      }),
    })
  }

  return (
    <div className="p-2 space-y-2">
      {/* Column headers (editable) */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-surface-100">
              {columns.map((col, ci) => (
                <th key={col.key} className="px-2 py-1 text-left font-semibold text-ink-muted">
                  <div className="flex items-center gap-1">
                    <input
                      value={col.label}
                      onChange={e => updateColumn(ci, 'label', e.target.value)}
                      className="bg-transparent outline-none w-full text-[10px] font-semibold"
                    />
                    {columns.length > 1 && (
                      <button onClick={() => removeColumn(ci)} className="text-ink-faint hover:text-red-500 shrink-0" title="Remove column">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-surface-100 group/trow">
                {columns.map(col => (
                  <td key={col.key} className="px-2 py-1">
                    <input
                      value={row[col.key] ?? ''}
                      onChange={e => updateRow(ri, col.key, e.target.value)}
                      className="bg-transparent outline-none w-full text-[10px]"
                      placeholder="\u2014"
                    />
                  </td>
                ))}
                <td className="px-1">
                  <button
                    onClick={() => removeRow(ri)}
                    className="sm:opacity-0 sm:group-hover/trow:opacity-100 text-ink-faint hover:text-red-500 transition-opacity touch-manipulation"
                    title="Remove row"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button onClick={addRow} className="btn-ghost text-[10px] inline-flex items-center gap-1 px-2 py-0.5">
          <Plus className="w-3 h-3" /> Row
        </button>
        <button onClick={addColumn} className="btn-ghost text-[10px] inline-flex items-center gap-1 px-2 py-0.5">
          <Plus className="w-3 h-3" /> Column
        </button>
        <label className="flex items-center gap-1 text-[10px] text-ink-muted ml-auto">
          <input
            type="checkbox"
            checked={showTotals}
            onChange={e => onChange({ ...block.data, showTotals: e.target.checked })}
            className="rounded"
          />
          Show Totals
        </label>
      </div>
    </div>
  )
}
