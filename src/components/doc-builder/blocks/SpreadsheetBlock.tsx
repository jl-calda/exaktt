// src/components/doc-builder/blocks/SpreadsheetBlock.tsx
'use client'
import { useState, useRef, useCallback, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { DocBlock, CellData } from '@/lib/doc-builder/types'
import { indexToColLetter, evaluateFormula, resolveAllCells } from '@/lib/doc-builder/formula-engine'

type Block = Extract<DocBlock, { type: 'spreadsheet' }>

interface Props {
  block: Block
  onChange: (data: Block['data']) => void
}

export default function SpreadsheetBlock({ block, onChange }: Props) {
  const { columns, rows, cells } = block.data
  const [activeCell, setActiveCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Resolve all formulas for display
  const resolved = useMemo(() => resolveAllCells(cells), [cells])

  const cellKey = useCallback((col: number, row: number) =>
    `${indexToColLetter(col)}${row + 1}`, [])

  function getCellData(key: string): CellData {
    return cells[key] ?? { value: '' }
  }

  function startEditing(key: string) {
    const cell = getCellData(key)
    setActiveCell(key)
    setEditValue(cell.formula ?? cell.value)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commitEdit() {
    if (!activeCell) return
    const newCells = { ...cells }
    const val = editValue.trim()

    if (val.startsWith('=')) {
      newCells[activeCell] = { ...getCellData(activeCell), formula: val, value: '' }
    } else {
      newCells[activeCell] = { ...getCellData(activeCell), value: val, formula: undefined }
    }

    onChange({ ...block.data, cells: newCells })
    setActiveCell(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
      // Move to next row
      if (activeCell) {
        const m = activeCell.match(/^([A-Z]+)(\d+)$/)
        if (m) {
          const nextRow = parseInt(m[2]) + 1
          if (nextRow <= rows) {
            const nextKey = `${m[1]}${nextRow}`
            startEditing(nextKey)
          }
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      commitEdit()
      // Move to next column
      if (activeCell) {
        const m = activeCell.match(/^([A-Z]+)(\d+)$/)
        if (m) {
          const colIdx = m[1].charCodeAt(0) - 65
          if (colIdx + 1 < columns) {
            const nextKey = `${indexToColLetter(colIdx + 1)}${m[2]}`
            startEditing(nextKey)
          }
        }
      }
    } else if (e.key === 'Escape') {
      setActiveCell(null)
    }
  }

  function addRow() {
    onChange({ ...block.data, rows: rows + 1 })
  }

  function addColumn() {
    onChange({ ...block.data, columns: columns + 1 })
  }

  function removeRow() {
    if (rows <= 1) return
    // Remove cells in last row
    const newCells = { ...cells }
    for (let c = 0; c < columns; c++) {
      delete newCells[cellKey(c, rows - 1)]
    }
    onChange({ ...block.data, rows: rows - 1, cells: newCells })
  }

  function removeColumn() {
    if (columns <= 1) return
    // Remove cells in last column
    const newCells = { ...cells }
    for (let r = 0; r < rows; r++) {
      delete newCells[cellKey(columns - 1, r)]
    }
    onChange({ ...block.data, columns: columns - 1, cells: newCells })
  }

  const activeCellData = activeCell ? getCellData(activeCell) : null

  return (
    <div className="mb-4 group/sheet">
      {/* Formula bar */}
      {activeCell && (
        <div className="flex items-center gap-2 mb-1 text-[10px] bg-surface-50 border border-surface-200 rounded px-2 py-1">
          <span className="font-mono font-semibold text-ink-muted w-8">{activeCell}</span>
          <div className="w-px h-3 bg-surface-200" />
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none font-mono text-[11px]"
            placeholder="Enter value or formula (=SUM(A1:A5))"
          />
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto border border-surface-200 rounded">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-surface-100">
              {/* Row number header */}
              <th className="w-8 px-1 py-1 text-[10px] text-ink-faint font-normal border-r border-b border-surface-200" />
              {Array.from({ length: columns }, (_, c) => (
                <th
                  key={c}
                  className="px-2 py-1 text-[10px] text-ink-faint font-medium text-center border-r border-b border-surface-200 min-w-[80px]"
                >
                  {indexToColLetter(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r} className="group/srow">
                {/* Row number */}
                <td className="px-1 py-0.5 text-[10px] text-ink-faint text-center bg-surface-50 border-r border-b border-surface-200 select-none">
                  {r + 1}
                </td>
                {Array.from({ length: columns }, (_, c) => {
                  const key = cellKey(c, r)
                  const isActive = activeCell === key
                  const cell = getCellData(key)
                  const displayValue = resolved[key] ?? cell.value ?? ''

                  return (
                    <td
                      key={c}
                      className={`px-1 py-0.5 border-r border-b border-surface-200 cursor-cell
                        ${isActive ? 'ring-2 ring-primary/40 ring-inset bg-white' : 'hover:bg-surface-50'}
                        ${cell.bold ? 'font-semibold' : ''}`}
                      style={{ textAlign: cell.align ?? 'left' }}
                      onClick={() => !isActive && startEditing(key)}
                    >
                      {isActive ? (
                        <input
                          ref={inputRef}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={handleKeyDown}
                          className="w-full bg-transparent outline-none font-mono text-[11px]"
                          autoFocus
                        />
                      ) : (
                        <span className={`block truncate text-[11px] ${cell.formula ? 'text-ink' : 'text-ink'}`}>
                          {displayValue || '\u00A0'}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controls — hover reveal */}
      <div className="flex items-center gap-2 mt-1 opacity-0 group-hover/sheet:opacity-100 transition-opacity">
        <button onClick={addRow} className="text-[10px] text-ink-faint hover:text-ink inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-surface-50 rounded transition-colors">
          <Plus className="w-2.5 h-2.5" /> Row
        </button>
        <button onClick={addColumn} className="text-[10px] text-ink-faint hover:text-ink inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-surface-50 rounded transition-colors">
          <Plus className="w-2.5 h-2.5" /> Column
        </button>
        <div className="w-px h-3 bg-surface-200" />
        <button onClick={removeRow} disabled={rows <= 1} className="text-[10px] text-ink-faint hover:text-red-500 disabled:opacity-30 inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-red-50 rounded transition-colors">
          <Trash2 className="w-2.5 h-2.5" /> Row
        </button>
        <button onClick={removeColumn} disabled={columns <= 1} className="text-[10px] text-ink-faint hover:text-red-500 disabled:opacity-30 inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-red-50 rounded transition-colors">
          <Trash2 className="w-2.5 h-2.5" /> Col
        </button>
      </div>
    </div>
  )
}
