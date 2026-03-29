// src/components/doc-builder/blocks/TableBlock.tsx
'use client'
import { useState } from 'react'
import { Plus, Trash2, Calculator } from 'lucide-react'
import type { DocBlock, TableColumn, DocEstimate } from '@/lib/doc-builder/types'


type Block = Extract<DocBlock, { type: 'table' }>

interface Props {
  block: Block
  onChange: (data: Block['data']) => void
  estimates?: DocEstimate[]
}

export default function TableBlock({ block, onChange, estimates }: Props) {
  const { columns, rows, showTotals, totalLabel, currency } = block.data
  const [showEstimatePicker, setShowEstimatePicker] = useState(false)
  const [selectedEstimate, setSelectedEstimate] = useState<DocEstimate | null>(null)

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

  function addEstimateSummary(est: DocEstimate) {
    const row: Record<string, any> = {}
    const noCol = columns.find(c => c.key === 'no' || c.label === '#')
    if (noCol) row[noCol.key] = rows.length + 1
    const descCol = columns.find(c => c.key === 'description' || c.key === 'item' || c.label.toLowerCase().includes('description'))
    if (descCol) row[descCol.key] = est.description
    for (const col of columns) {
      if (col.format === 'currency' || col.key === 'amount' || col.key === 'total' || col.key === 'unitPrice') row[col.key] = est.amount
      if (row[col.key] === undefined) row[col.key] = ''
    }
    onChange({ ...block.data, rows: [...rows, row] })
    setShowEstimatePicker(false)
    setSelectedEstimate(null)
  }

  function addEstimateBreakdown(est: DocEstimate) {
    const snap = est.resultSnapshot
    if (!snap?.bom?.length) { addEstimateSummary(est); return }

    let cols = [...columns]
    const hasUnit = cols.some(c => c.key === 'unit')
    const hasQty = cols.some(c => c.key === 'qty')
    const hasUnitPrice = cols.some(c => c.key === 'unitPrice')
    const descIdx = cols.findIndex(c => c.key === 'description' || c.key === 'item')
    const insertAt = descIdx >= 0 ? descIdx + 1 : 1

    const newCols: TableColumn[] = []
    if (!hasUnit) newCols.push({ key: 'unit', label: 'Unit', width: '50px', align: 'center' as const })
    if (!hasQty) newCols.push({ key: 'qty', label: 'Qty', width: '60px', align: 'right' as const, format: 'number' as const })
    if (!hasUnitPrice) newCols.push({ key: 'unitPrice', label: 'Unit Price', width: '90px', align: 'right' as const, format: 'currency' as const })
    if (newCols.length > 0) cols = [...cols.slice(0, insertAt), ...newCols, ...cols.slice(insertAt)]

    const startNum = rows.length + 1
    const bomRows: Record<string, any>[] = snap.bom.map((m: any, i: number) => {
      const row: Record<string, any> = {}
      for (const col of cols) {
        if (col.key === 'no' || col.label === '#') row[col.key] = startNum + i
        else if (col.key === 'description' || col.key === 'item') row[col.key] = m.name + (m.productCode ? ` — ${m.productCode}` : '')
        else if (col.key === 'unit') row[col.key] = m.unit ?? ''
        else if (col.key === 'qty') row[col.key] = m.grandTotal ?? 0
        else if (col.key === 'unitPrice') row[col.key] = m.unitPrice ?? 0
        else if (col.format === 'currency' || col.key === 'amount' || col.key === 'total') row[col.key] = m.lineTotal ?? 0
        else row[col.key] = ''
      }
      return row
    })

    const summaryRows: Record<string, any>[] = []
    const totals = snap.totals
    if (totals) {
      const makeSummaryRow = (label: string, amount: number) => {
        const row: Record<string, any> = {}
        for (const col of cols) {
          if (col.key === 'description' || col.key === 'item') row[col.key] = label
          else if (col.format === 'currency' || col.key === 'amount' || col.key === 'total') row[col.key] = amount
          else row[col.key] = ''
        }
        return row
      }
      if (totals.materialCost > 0) summaryRows.push(makeSummaryRow('Material Cost', totals.materialCost))
      if (totals.labourCost > 0) summaryRows.push(makeSummaryRow('Labour Cost', totals.labourCost))
      if (totals.thirdPartyCost > 0) summaryRows.push(makeSummaryRow('Third Party Cost', totals.thirdPartyCost))
      summaryRows.push(makeSummaryRow('Grand Total', totals.grandTotal))
    }

    onChange({ ...block.data, columns: cols, rows: [...rows, ...bomRows, ...summaryRows] })
    setShowEstimatePicker(false)
    setSelectedEstimate(null)
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

  // Filter out already-added estimates (by description match)
  const addedDescs = new Set(rows.map(r => {
    const descCol = columns.find(c => c.key === 'description' || c.key === 'item')
    return descCol ? r[descCol.key] : null
  }).filter(Boolean))

  const availableEstimates = (estimates ?? []).filter(e => !addedDescs.has(e.description))

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

      {/* Add row/column/estimate — hover reveal */}
      <div className="flex items-center gap-2 mt-1 opacity-0 group-hover/table:opacity-100 transition-opacity">
        <button onClick={addRow} className="text-[10px] text-ink-faint hover:text-ink inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-surface-50 rounded transition-colors">
          <Plus className="w-2.5 h-2.5" /> Row
        </button>
        <button onClick={addColumn} className="text-[10px] text-ink-faint hover:text-ink inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-surface-50 rounded transition-colors">
          <Plus className="w-2.5 h-2.5" /> Column
        </button>
        {estimates && estimates.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowEstimatePicker(v => !v)}
              className="text-[10px] text-primary hover:text-primary/80 inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-primary/5 rounded transition-colors font-medium"
            >
              <Calculator className="w-2.5 h-2.5" /> Add Estimate
            </button>

            {showEstimatePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setShowEstimatePicker(false); setSelectedEstimate(null) }} />
                <div className="absolute left-0 bottom-full mb-1 z-50 card p-1 shadow-panel min-w-[280px] max-h-[240px] overflow-y-auto animate-fade-in">
                  {availableEstimates.length === 0 ? (
                    <div className="px-3 py-2 text-[10px] text-ink-faint text-center">
                      {estimates.length === 0 ? 'No estimates linked to this tender' : 'All estimates already added'}
                    </div>
                  ) : (
                    availableEstimates.map(est => (
                      <div key={est.id}>
                        <button
                          onClick={() => setSelectedEstimate(selectedEstimate?.id === est.id ? null : est)}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-100 transition-colors flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-medium text-ink truncate">{est.description}</div>
                            <div className="text-[10px] text-ink-faint">{est.systemName} — {est.jobName}</div>
                          </div>
                          <span className="text-[10px] font-mono text-ink-muted shrink-0">
                            {est.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </button>
                        {selectedEstimate?.id === est.id && (
                          <div className="flex gap-1.5 px-3 pb-2 animate-fade-in">
                            <button
                              onClick={() => addEstimateSummary(est)}
                              className="flex-1 text-[10px] font-medium text-ink-muted hover:text-ink px-2 py-1.5 rounded-md bg-surface-100 hover:bg-surface-200 transition-colors"
                            >
                              Summary
                            </button>
                            <button
                              onClick={() => addEstimateBreakdown(est)}
                              className="flex-1 text-[10px] font-medium text-primary hover:text-primary/80 px-2 py-1.5 rounded-md bg-primary/5 hover:bg-primary/10 transition-colors"
                            >
                              Breakdown
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
