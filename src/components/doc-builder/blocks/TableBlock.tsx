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

  // Calculate totals for currency columns
  const totals: Record<string, number> = {}
  if (showTotals) {
    for (const col of columns) {
      if (col.format === 'currency') {
        totals[col.key] = rows.reduce((s, r) => s + (parseFloat(r[col.key]) || 0), 0)
      }
    }
  }

  return (
    <div className="mb-4 group/table">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          {/* Dark header row — matches PDF */}
          <thead>
            <tr className="bg-ink text-white">
              {columns.map((col, ci) => (
                <th
                  key={col.key}
                  className="px-2 py-1.5 font-semibold text-left"
                  style={{ textAlign: col.align ?? 'left' }}
                >
                  <div className="flex items-center gap-1">
                    <input
                      value={col.label}
                      onChange={e => updateColumn(ci, 'label', e.target.value)}
                      className="bg-transparent outline-none w-full text-[11px] font-semibold text-white placeholder-white/40"
                      placeholder="Column"
                    />
                    {columns.length > 1 && (
                      <button
                        onClick={() => removeColumn(ci)}
                        className="text-white/30 hover:text-white shrink-0 transition-colors"
                        title="Remove column"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-7" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={`group/trow border-b border-surface-200 ${ri % 2 === 1 ? 'bg-surface-50' : ''}`}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className="px-2 py-1.5"
                    style={{ textAlign: col.align ?? 'left' }}
                  >
                    <input
                      value={row[col.key] ?? ''}
                      onChange={e => updateRow(ri, col.key, e.target.value)}
                      className="bg-transparent outline-none w-full text-[11px] hover:bg-surface-100/50 focus:bg-surface-100/50 rounded px-0.5 transition-colors"
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

          {/* Totals row — dark background matching PDF */}
          {showTotals && Object.keys(totals).length > 0 && (
            <tfoot>
              <tr className="bg-ink text-white font-semibold">
                {columns.map((col, ci) => {
                  if (totals[col.key] != null) {
                    return (
                      <td key={col.key} className="px-2 py-1.5 text-[11px]" style={{ textAlign: col.align ?? 'right' }}>
                        {totals[col.key].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    )
                  }
                  const firstTotalIdx = columns.findIndex(c => totals[c.key] != null)
                  if (ci === firstTotalIdx - 1 || (firstTotalIdx === 0 && ci === 0)) {
                    return (
                      <td key={col.key} className="px-2 py-1.5 text-[11px] text-right">
                        {totalLabel ?? 'Total'}
                      </td>
                    )
                  }
                  return <td key={col.key} />
                })}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add row/column — hover reveal */}
      <div className="flex items-center gap-2 mt-1 opacity-0 group-hover/table:opacity-100 transition-opacity">
        <button onClick={addRow} className="text-[10px] text-ink-faint hover:text-ink inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-surface-50 rounded transition-colors">
          <Plus className="w-2.5 h-2.5" /> Row
        </button>
        <button onClick={addColumn} className="text-[10px] text-ink-faint hover:text-ink inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-surface-50 rounded transition-colors">
          <Plus className="w-2.5 h-2.5" /> Column
        </button>
      </div>
    </div>
  )
}
