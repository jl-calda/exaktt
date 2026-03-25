// src/lib/engine/solver.ts
// TypeScript port of the stock length and sheet cut solvers from the artifact

import type { StockSolveResult, SheetSolveResult } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// STOCK LENGTH SOLVER
// Given a target length in mm, find the optimal combination of stock lengths
// ─────────────────────────────────────────────────────────────────────────────

export function solveStockLengths(
  target: number,
  stockLengths: number[],
  optimMode: 'min_waste' | 'min_sections' = 'min_waste',
  overrides: Record<string, number> = {}
): StockSolveResult {
  if (target <= 0 || stockLengths.length === 0) {
    return { items: [], totalQty: 0, totalCovered: 0, cutWaste: 0 }
  }

  const lengths = [...stockLengths].map(Number).filter(l => l > 0).sort((a, b) => b - a)

  // Greedy: try each length combination
  let bestCombo: Record<number, number> = {}
  let bestScore = Infinity

  const tryCombo = (remaining: number, combo: Record<number, number>, depth: number): void => {
    if (depth > 12) return
    if (remaining <= 0) {
      const totalQty = Object.values(combo).reduce((a, b) => a + b, 0)
      const totalCovered = Object.entries(combo).reduce((a, [l, q]) => a + Number(l) * q, 0)
      const waste = totalCovered - target
      const score = optimMode === 'min_sections' ? totalQty * 1000 + waste : waste * 1000 + totalQty
      if (score < bestScore) {
        bestScore = score
        bestCombo = { ...combo }
      }
      return
    }

    for (const len of lengths) {
      const needed = Math.ceil(remaining / len)
      for (let q = needed; q >= Math.max(1, needed - 1); q--) {
        tryCombo(remaining - len * q, { ...combo, [len]: (combo[len] ?? 0) + q }, depth + 1)
      }
    }
  }

  tryCombo(target, {}, 0)

  // Apply overrides
  const finalCombo = { ...bestCombo }
  Object.entries(overrides).forEach(([l, q]) => {
    if (parseInt(q as any) >= 0) finalCombo[Number(l)] = Number(q)
  })

  const totalCovered = Object.entries(finalCombo).reduce((a, [l, q]) => a + Number(l) * q, 0)
  const items = lengths.map(l => ({
    length:  l,
    qty:     finalCombo[l] ?? 0,
    covered: l * (finalCombo[l] ?? 0),
  }))

  return {
    items,
    totalQty:     items.reduce((a, i) => a + i.qty, 0),
    totalCovered,
    cutWaste:     Math.max(0, totalCovered - target),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET / PLATE SOLVER
// Given sheet dimensions and part dimensions, find optimal cutting layout
// ─────────────────────────────────────────────────────────────────────────────

export function solveSheetCut({
  sheetW = 2400,
  sheetH = 1200,
  partW  = 600,
  partH  = 400,
  kerf   = 3,
  partsNeeded = 1,
  allowRotation = true,
}: {
  sheetW?: number
  sheetH?: number
  partW?: number
  partH?: number
  kerf?: number
  partsNeeded?: number
  allowRotation?: boolean
}): SheetSolveResult {
  if (sheetW <= 0 || sheetH <= 0 || partW <= 0 || partH <= 0 || partsNeeded <= 0) {
    return { sheetsNeeded: 0, partsPerSheet: 0, cols: 0, rows: 0, effectivePartW: 0, effectivePartH: 0, waste_pct: 0, utilisation: 0, rotated: false, sheetW, sheetH, kerf }
  }

  const kf = kerf ?? 0

  const colsA = Math.floor(sheetW / (partW + kf))
  const rowsA = Math.floor(sheetH / (partH + kf))
  const ppsA  = colsA * rowsA

  const colsB = allowRotation ? Math.floor(sheetW / (partH + kf)) : 0
  const rowsB = allowRotation ? Math.floor(sheetH / (partW + kf)) : 0
  const ppsB  = colsB * rowsB

  const useBetter    = allowRotation && ppsB > ppsA
  const cols         = useBetter ? colsB : colsA
  const rows         = useBetter ? rowsB : rowsA
  const effectivePartW = useBetter ? partH : partW
  const effectivePartH = useBetter ? partW : partH
  const rawPps       = useBetter ? ppsB : ppsA
  if (rawPps === 0) {
    return { sheetsNeeded: 0, partsPerSheet: 0, cols: 0, rows: 0, effectivePartW: 0, effectivePartH: 0, waste_pct: 100, utilisation: 0, rotated: false, sheetW, sheetH, kerf: kf }
  }
  const pps          = Math.max(1, rawPps)

  const sheetsNeeded = Math.ceil(partsNeeded / pps)
  const sheetArea    = sheetW * sheetH
  const usedArea     = cols * rows * effectivePartW * effectivePartH
  const utilisation  = parseFloat(((usedArea / sheetArea) * 100).toFixed(1))
  const waste_pct    = parseFloat((100 - utilisation).toFixed(1))

  return { sheetsNeeded, partsPerSheet: pps, cols, rows, effectivePartW, effectivePartH, waste_pct, utilisation, rotated: useBetter, sheetW, sheetH, kerf: kf }
}
