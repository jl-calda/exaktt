// src/components/calculator/CalculatorTab.tsx
'use client'
import { useState } from 'react'
import { Plus, Copy, Trash2, Play, Save, AlertTriangle, Lock, ChevronDown, ChevronUp, Clock, Printer, TableProperties, PanelRightOpen, PanelRightClose, BookOpen, X } from 'lucide-react'
import { nanoid } from 'nanoid'
import type { MtoSystem, GlobalTag, Run, Segment, WorkScheduleSummary, WorkScheduleResult, ActivityPhase, JobLastResults } from '@/types'
import type { Plan } from '@prisma/client'
import { useCalcStore } from '@/store'
import { getLimits } from '@/lib/limits'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import UpgradePrompt from '@/components/billing/UpgradePrompt'
import { computeWorkSchedule, computeBracketQtys, computeBracketBOM } from '@/lib/engine/work'
import { PRIMITIVE_DIMS, DIMS_FOR_INPUT_MODEL } from '@/lib/engine/constants'
import { normalizeInputModel } from '@/types'
import SystemOverviewPanel from './SystemOverviewPanel'

interface Props {
  sys:        MtoSystem
  jobs:       any[]
  onSaveJob:  (name: string, lastResults?: JobLastResults | null) => Promise<void>
  onRunCalc:  () => void
  globalTags: GlobalTag[]
  plan?:      Plan
}

function buildLastResults(
  sys: MtoSystem,
  runs: Run[],
  multiResults: any,
  workSchedule: WorkScheduleSummary | null,
): JobLastResults {
  const priceMap = Object.fromEntries(sys.materials.map((m: any) => [m.id, m.unitPrice ?? null]))
  const combined = (multiResults?.combined ?? [])

  const bom = combined.filter((m: any) => !m.allBlocked).map((m: any) => {
    const unitPrice = priceMap[m.id] as number | null
    return {
      id: m.id, name: m.name, productCode: m.productCode ?? '', unit: m.unit ?? '',
      unitPrice,
      grandTotal: m.grandTotal,
      lineTotal: unitPrice != null ? unitPrice * m.grandTotal : null,
      perRun: (m.perRun ?? []).map((pr: any) => ({
        runName: pr.runName, runQty: pr.runQty, unitQty: pr.unitQty, totalQty: pr.totalQty,
      })),
    }
  })

  const gated = combined.filter((m: any) => m.allBlocked).map((m: any) => ({ id: m.id, name: m.name }))

  const breakdown = runs.map((run, ri) => {
    const dims = getRunDims(run, sys)
    return {
      runName: run.name, qty: run.qty,
      dims,
      criteriaState: run.criteriaState ?? {},
      variantState:  run.variantState  ?? {},
      materials: combined.filter((m: any) => !m.allBlocked).map((m: any) => {
        const pr = m.perRun?.[ri]
        const ar = pr?.activeRow
        const isBracketOnly = m._isBracketMat && (!pr || pr.unitQty === 0)
        const unitPrice = priceMap[m.id] as number | null
        const unitQty = isBracketOnly ? (ri === 0 ? (m._bracketQty ?? m.grandTotal) : 0) : (pr?.unitQty ?? 0)
        return {
          id: m.id, name: m.name,
          ruleType: isBracketOnly ? 'bracket' : (ar?.ruleType ?? ''),
          formula: isBracketOnly ? 'from bracket BOM' : (pr ? formulaTextForPrint(ar, dims, sys) : ''),
          raw: isBracketOnly ? 0 : (pr?.raw ?? 0), unitQty,
          unitPrice,
          lineTotal: unitPrice != null ? unitPrice * unitQty : null,
        }
      }),
    }
  })

  const materialCost = bom.reduce((a: number, m: any) => a + (m.lineTotal ?? 0), 0)
  const labourCost   = workSchedule?.totalLabourCost ?? 0
  const thirdCost    = workSchedule?.totalThirdPartyCost ?? 0

  return {
    runs: runs.map(r => ({ id: r.id, name: r.name, qty: r.qty })),
    bom, gated, breakdown,
    workSchedule: workSchedule ?? null,
    totals: {
      materialCost,
      labourCost,
      thirdPartyCost: thirdCost,
      grandTotal: materialCost + labourCost + thirdCost,
    },
  }
}

// ─── Breakdown helpers ────────────────────────────────────────────────────────

function getRelevantKeys(sys: MtoSystem): Set<string> {
  const keys = new Set<string>()
  const dimKeys = DIMS_FOR_INPUT_MODEL[sys.inputModel]
  if (dimKeys) {
    for (const k of dimKeys) keys.add(k)
  } else {
    // fallback: only dims actively referenced
    for (const k of PRIMITIVE_DIMS.map(d => d.key)) {
      const cds = sys.customDims ?? []
      if (cds.some(cd => cd.derivType === 'stock_length' && cd.stockTargetDim === k)
        || cds.some(cd => cd.derivType === 'spacing'     && cd.spacingTargetDim === k)
        || cds.some(cd => cd.derivType === 'formula'     && cd.formulaDimKey === k)
        || sys.materials.some(m => (m.ruleSet ?? []).some(r => r.ruleDimKey === k)))
        keys.add(k)
    }
  }
  for (const cd of (sys.customDims ?? []))
    if (cd.derivType === 'user_input') keys.add(cd.key)
  return keys
}

function getRunDims(run: Run, sys: MtoSystem): Record<string, number> {
  const relevant = getRelevantKeys(sys)
  const dims: Record<string, number> = {}
  if ((sys.inputModel === 'linear_run' || sys.inputModel === 'linear') && run.inputMode === 'simple') {
    dims.length  = parseFloat(run.simpleJob?.length  as any) || 0
    dims.corners   = 0
    dims.end1      = 1
    dims.end2      = 1
    dims.both_ends = 2
    dims['__spacing_int_brackets'] = parseFloat(run.simpleJob?.spacing as any) || 10
  }
  for (const [k, v] of Object.entries(run.job ?? {})) {
    if (!relevant.has(k)) continue          // ignore keys from other systems
    const n = parseFloat(String(v))
    if (!isNaN(n)) dims[k] = n
  }
  return dims
}

interface FormulaDef { leftTags: string[]; core: string; rightTags: string[] }

function getFormulaDef(activeRow: any, dims: Record<string, number>, sys: MtoSystem): FormulaDef {
  if (!activeRow) return { leftTags: [], core: '—', rightTags: [] }
  const fmt  = (n: number) => parseFloat(n.toFixed(3)).toString()
  const qty_ = parseFloat(activeRow.ruleQty)    || 0
  const div  = parseFloat(activeRow.ruleDivisor) || 1
  const key  = activeRow.ruleDimKey ?? ''
  const dimV = dims[key] ?? 0
  const cd   = (sys.customDims ?? []).find(c => c.key === key)
  const dimLabel = key ? (cd?.name ?? key) : ''
  const dimUnit  = key ? (cd?.unit  ?? '') : ''
  const L    = dims.length ?? 0
  const W    = dims.width  ?? 0
  const area = L * W
  const waste = parseFloat(activeRow.waste) || 0

  let leftTags: string[] = []
  let core = ''
  let rightTags: string[] = []

  switch (activeRow.ruleType) {
    case 'fixed_qty':
      core = `Fixed: ${qty_}`
      break
    case 'ratio':
      leftTags = [dimLabel]
      core = div !== 1
        ? `${fmt(dimV)}${dimUnit} × (${qty_} ÷ ${div})`
        : `${fmt(dimV)}${dimUnit} × ${qty_}`
      rightTags = div !== 1 ? ['factor'] : []
      break
    case 'ratio_length':
      leftTags = ['length']
      core = div !== 1 ? `${fmt(L)}m × (${qty_} ÷ ${div})` : `${fmt(L)}m × ${qty_}`
      rightTags = div !== 1 ? ['factor'] : []
      break
    case 'ratio_area':
      leftTags = ['area']
      core = `${fmt(L)}m × ${fmt(W)}m × (${qty_} ÷ ${div})`
      rightTags = ['factor']
      break
    case 'linear_metre':
      leftTags = ['length']
      core = `${fmt(L)}m × ${qty_}`
      break
    case 'base_plus_length':
      leftTags = ['length']
      core = `${qty_} + ${fmt(L)}m ÷ ${div}`
      break
    case 'coverage_per_item':
      leftTags = ['area']
      core = `${fmt(L)}m × ${fmt(W)}m ÷ ${div}`
      rightTags = ['m²/item']
      break
    case 'kg_per_sqm':
      leftTags = ['area']
      core = `${fmt(L)}m × ${fmt(W)}m × ${qty_}`
      rightTags = ['kg/m²']
      break
    case 'kg_per_metre':
      leftTags = ['length']
      core = `${fmt(L)}m × ${qty_}`
      rightTags = ['kg/m']
      break
    case 'kg_per_item':
      leftTags = [dimLabel]
      core = `${fmt(dimV)} × ${qty_}`
      rightTags = ['kg/item']
      break
    case 'tile_size': {
      const tw = (activeRow.ruleTileW || 600) / 1000
      const th = (activeRow.ruleTileH || 600) / 1000
      leftTags = ['area']
      core = `${fmt(L)}m × ${fmt(W)}m ÷ (${tw}m × ${th}m)`
      rightTags = [`${activeRow.ruleTileW}×${activeRow.ruleTileH}mm tile`]
      break
    }
    default:
      core = activeRow.ruleType
  }

  if (waste > 0) rightTags = [...rightTags, `+${waste}% waste`]
  return { leftTags, core, rightTags }
}

// Text version for print window
function formulaTextForPrint(activeRow: any, dims: Record<string, number>, sys: MtoSystem): string {
  const { leftTags, core, rightTags } = getFormulaDef(activeRow, dims, sys)
  const parts = [...leftTags.map(t => `[${t}]`), core, ...rightTags.map(t => `[${t}]`)]
  return parts.join(' ')
}

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-surface-100 text-ink-faint border border-surface-200 leading-none whitespace-nowrap">
      {label}
    </span>
  )
}

function FormulaCell({ activeRow, dims, sys }: { activeRow: any; dims: Record<string, number>; sys: MtoSystem }) {
  const { leftTags, core, rightTags } = getFormulaDef(activeRow, dims, sys)
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {leftTags.map((t, i) => <Tag key={i} label={t} />)}
      <span className="font-mono text-[11px] text-ink">{core}</span>
      {rightTags.map((t, i) => <Tag key={i} label={t} />)}
    </span>
  )
}

function getVariantLeafLabel(sys: MtoSystem, variantId: string, leafKey: string): string {
  const v = (sys.variants ?? []).find(v => v.id === variantId)
  if (!v) return leafKey
  const find = (nodes: any[]): string | null => {
    for (const n of nodes) {
      if (n.key === leafKey) return n.label
      if (n.children?.length) { const r = find(n.children); if (r) return r }
    }
    return null
  }
  return find(v.nodes) ?? leafKey
}

function openPrintWindow(
  sys: MtoSystem, runs: Run[], multiResults: any,
  workSchedule?: WorkScheduleSummary | null,
) {
  const combined = (multiResults?.combined ?? []).filter((m: any) => !m.allBlocked)
  const activeCriteria = (sys.customCriteria ?? []).filter(c => c.type === 'input')
  const variants       = sys.variants ?? []
  const hasPrice       = combined.some((m: any) => (m.unitPrice ?? 0) > 0)

  const PHASE_LABELS: Record<string, string> = {
    fabrication: 'Fabrication', installation: 'Installation',
    commissioning: 'Commissioning', transport: 'Transport', third_party: 'Third Party',
  }

  const runBlocks = runs.map((run, ri) => {
    const dims         = getRunDims(run, sys)
    const criteriaState = run.criteriaState ?? {}
    const variantState  = run.variantState  ?? {}

    const inputRow = Object.entries(dims)
      .filter(([k, v]) => !k.startsWith('__') && v > 0)
      .map(([k, v]) => {
        const cd    = (sys.customDims ?? []).find(c => c.key === k)
        const label = cd?.name ?? k
        const unit  = cd?.unit ?? (['length','width','height','perimeter'].includes(k) ? 'm' : '')
        return `<span class="badge">${label}: <b>${v}${unit}</b></span>`
      }).join(' ')

    const criteriaRow = activeCriteria.length
      ? activeCriteria.map(cr => {
          const on = criteriaState[cr.key] === true
          return `<span class="badge ${on ? 'badge-on' : 'badge-off'}">${cr.icon ?? ''} ${cr.name}: <b>${on ? 'YES' : 'NO'}</b></span>`
        }).join(' ')
      : ''

    const variantRow = variants.length
      ? variants.map(v => {
          const sel = variantState[v.id]
          const label = sel ? getVariantLeafLabel(sys, v.id, sel) : '—'
          return `<span class="badge">${v.icon ?? ''} ${v.name}: <b>${label}</b></span>`
        }).join(' ')
      : ''

    let runTotal = 0
    const matRows = combined.map((mat: any) => {
      const pr = mat.perRun?.[ri]
      if (!pr) return ''
      const ar      = pr.activeRow
      const formula = formulaTextForPrint(ar, dims, sys)
      const lineTotal = mat.unitPrice != null ? mat.unitPrice * pr.unitQty : null
      if (lineTotal != null) runTotal += lineTotal
      const priceCells = hasPrice
        ? `<td class="mono right">${mat.unitPrice != null ? '$' + mat.unitPrice.toFixed(2) : '—'}</td>
           <td class="mono right bold-price">${lineTotal != null ? '$' + lineTotal.toFixed(2) : '—'}</td>`
        : ''
      return `<tr>
        <td class="name">${mat.name}</td>
        <td>${mat.productCode || '—'}</td>
        <td class="mono">${ar?.ruleType ?? '—'}</td>
        <td class="mono">${formula}</td>
        <td class="mono right">${pr.raw}</td>
        <td class="mono right bold">${pr.unitQty} ${mat.unit}</td>
        ${priceCells}
      </tr>`
    }).join('')

    const matFooter = hasPrice ? `<tfoot><tr>
      <td colspan="6" class="right muted" style="font-size:10px">Run total</td>
      <td></td>
      <td class="mono right bold">${runTotal > 0 ? '$' + runTotal.toFixed(2) : '—'}</td>
    </tr></tfoot>` : ''

    const priceHeaders = hasPrice ? '<th>Unit Price</th><th>Total</th>' : ''

    return `<div class="run-block">
      <h3>Run #${ri + 1}: ${run.name}${run.qty > 1 ? ' <span class="muted">×' + run.qty + '</span>' : ''}</h3>
      <table class="vars-table">
        ${inputRow    ? `<tr><td class="var-label">Inputs</td><td class="var-vals">${inputRow}</td></tr>`    : ''}
        ${criteriaRow ? `<tr><td class="var-label">Criteria</td><td class="var-vals">${criteriaRow}</td></tr>` : ''}
        ${variantRow  ? `<tr><td class="var-label">Variants</td><td class="var-vals">${variantRow}</td></tr>`  : ''}
      </table>
      <table>
        <thead><tr><th>Material</th><th>Code</th><th>Rule</th><th>Formula</th><th>Raw</th><th>Qty</th>${priceHeaders}</tr></thead>
        <tbody>${matRows}</tbody>
        ${matFooter}
      </table>
    </div>`
  }).join('')

  const workScheduleBlock = workSchedule ? (() => {
    const phases = Object.entries(workSchedule.byPhase)
    if (!phases.length) return ''
    const rows = phases.flatMap(([phase, items]) =>
      (items as WorkScheduleResult[]).map(item =>
        `<tr>
          <td>${PHASE_LABELS[phase] ?? phase}</td>
          <td class="name">${item.activityName}</td>
          <td class="mono right">${item.sourceQty} ${item.sourceUnit}</td>
          <td class="mono right">${item.timePerUnit.toFixed(1)} min</td>
          <td class="mono right">${item.totalHours.toFixed(2)} hr</td>
          ${item.labourCost != null ? `<td class="mono right bold-price">$${item.labourCost.toFixed(2)}</td>` : '<td>—</td>'}
        </tr>`
      )
    ).join('')
    const totalLabour = workSchedule.totalLabourCost != null ? `$${workSchedule.totalLabourCost.toFixed(2)}` : '—'
    const totalThird  = workSchedule.totalThirdPartyCost != null ? `$${workSchedule.totalThirdPartyCost.toFixed(2)}` : null
    return `<div class="run-block">
      <h3>Work Schedule</h3>
      <table>
        <thead><tr><th>Phase</th><th>Activity</th><th>Qty</th><th>Time/Unit</th><th>Total Hours</th><th>Labour Cost</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="4" class="right muted" style="font-size:10px">Total hours</td>
              <td class="mono right bold">${workSchedule.totalElapsedHours.toFixed(2)} hr</td><td></td></tr>
          <tr><td colspan="4" class="right muted" style="font-size:10px">Total labour cost</td>
              <td></td><td class="mono right bold-price">${totalLabour}</td></tr>
          ${totalThird ? `<tr><td colspan="4" class="right muted" style="font-size:10px">Third party cost</td>
              <td></td><td class="mono right bold-price">${totalThird}</td></tr>` : ''}
        </tfoot>
      </table>
    </div>`
  })() : ''

  const html = `<!DOCTYPE html><html><head>
    <title>Calculation Breakdown — ${sys.name}</title>
    <style>
      body        { font-family: -apple-system, sans-serif; font-size: 12px; padding: 24px; color: #1e293b; }
      h1          { font-size: 18px; margin: 0 0 2px; }
      .meta       { font-size: 12px; color: #64748b; margin-bottom: 20px; }
      h3          { font-size: 13px; font-weight: 700; margin: 0 0 8px; }
      .run-block  { margin-bottom: 28px; }
      .vars-table { width: auto; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
      .var-label  { padding: 4px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing:.05em; color: #94a3b8; background: #f8fafc; border-right: 1px solid #e2e8f0; white-space: nowrap; }
      .var-vals   { padding: 4px 8px; background: #fff; }
      .badge      { display: inline-block; font-size: 10px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 1px 6px; margin: 1px 2px; color: #475569; }
      .badge-on   { background: #dcfce7; border-color: #bbf7d0; color: #166534; }
      .badge-off  { background: #f1f5f9; color: #94a3b8; }
      table       { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
      th          { background: #f1f5f9; text-align: left; padding: 5px 8px; font-size: 10px; text-transform: uppercase; letter-spacing:.04em; color:#64748b; border-bottom: 2px solid #e2e8f0; }
      td          { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; }
      td.name     { font-size: 12px; font-weight: 500; }
      td.mono     { font-family: 'Courier New', monospace; }
      td.right    { text-align: right; }
      td.bold     { font-weight: 700; color: #7c3aed; }
      td.bold-price { font-weight: 700; color: #059669; }
      .muted      { color: #94a3b8; font-weight: normal; }
      footer      { font-size: 10px; color: #94a3b8; margin-top: 24px; }
      @media print { body { padding: 12px; } }
    </style>
  </head><body>
    <h1>${sys.name}</h1>
    <p class="meta">Calculation Breakdown &nbsp;·&nbsp; ${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
    ${runBlocks}
    ${workScheduleBlock}
    <footer>Generated by MaterialMTO &nbsp;·&nbsp; Quantities rounded up to nearest whole unit per run</footer>
  </body></html>`

  const w = window.open('', '_blank', 'width=900,height=700')
  if (w) { w.document.write(html); w.document.close(); w.print() }
}

// ─── Breakdown panel (inline) ─────────────────────────────────────────────────

function CalcBreakdownPanel({ sys, runs, multiResults, workSchedule }: {
  sys: MtoSystem; runs: Run[]; multiResults: any
  workSchedule?: WorkScheduleSummary | null
}) {
  const combined        = (multiResults?.combined ?? []).filter((m: any) => !m.allBlocked)
  const activeCriteria  = (sys.customCriteria ?? []).filter(c => c.type === 'input')
  const variants        = sys.variants ?? []
  const hasPrice        = combined.some((m: any) => (m.unitPrice ?? 0) > 0)
  const PHASE_LABELS: Record<string, string> = {
    fabrication: 'Fabrication', installation: 'Installation',
    commissioning: 'Commissioning', transport: 'Transport', third_party: 'Third Party',
  }
  const RULE_LABELS: Record<string, string> = {
    fixed_qty: 'Fixed', ratio: 'Ratio', ratio_length: 'Ratio × L', ratio_area: 'Ratio × Area',
    linear_metre: 'Linear m', base_plus_length: 'Base + L', coverage_per_item: 'Coverage',
    kg_per_sqm: 'kg/m²', kg_per_metre: 'kg/m', kg_per_item: 'kg/item',
    tile_size: 'Tile size', stock_length_qty: 'Stock length',
  }
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 bg-surface-50 border-b border-surface-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TableProperties className="w-4 h-4 text-ink-muted" />
          <span className="font-semibold text-sm text-ink">Calculation Breakdown</span>
        </div>
        <button onClick={() => openPrintWindow(sys, runs, multiResults, workSchedule)}
          className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
      </div>

      {runs.map((run, ri) => {
        const dims          = getRunDims(run, sys)
        const runCriteria   = run.criteriaState ?? {}
        const runVariants   = run.variantState  ?? {}
        const inputEntries  = Object.entries(dims).filter(([k, v]) => !k.startsWith('__') && v > 0)
        return (
          <div key={run.id} className="border-b border-surface-200 last:border-0">
            {/* Run title */}
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">#{ri + 1} {run.name}</span>
              {run.qty > 1 && <span className="text-[10px] text-ink-faint font-semibold">×{run.qty}</span>}
            </div>

            {/* Variables block */}
            <div className="mx-4 mb-3 rounded-lg border border-surface-200 overflow-hidden text-xs">
              {/* Inputs row */}
              {inputEntries.length > 0 && (
                <div className="flex items-start gap-3 px-3 py-2 border-b border-surface-100 last:border-0">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-faint w-14 flex-shrink-0 pt-0.5">Inputs</span>
                  <div className="flex flex-wrap gap-1">
                    {inputEntries.map(([k, v]) => {
                      const cd    = (sys.customDims ?? []).find(c => c.key === k)
                      const label = cd?.name ?? k
                      const unit  = cd?.unit ?? (['length','width','height','perimeter'].includes(k) ? 'm' : '')
                      return (
                        <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-100 border border-surface-200 text-[10px] text-ink-muted">
                          {label}: <span className="font-semibold text-ink">{v}{unit}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
              {/* Criteria row */}
              {activeCriteria.length > 0 && (
                <div className="flex items-start gap-3 px-3 py-2 border-b border-surface-100 last:border-0">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-faint w-14 flex-shrink-0 pt-0.5">Criteria</span>
                  <div className="flex flex-wrap gap-1">
                    {activeCriteria.map(cr => {
                      const on = runCriteria[cr.key] === true
                      return (
                        <span key={cr.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold ${on ? 'bg-green-50 border-green-200 text-green-700' : 'bg-surface-100 border-surface-200 text-ink-faint'}`}>
                          {cr.icon && <span>{cr.icon}</span>}
                          {cr.name}: <span>{on ? 'YES' : 'NO'}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
              {/* Variants row */}
              {variants.length > 0 && (
                <div className="flex items-start gap-3 px-3 py-2 last:border-0">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-faint w-14 flex-shrink-0 pt-0.5">Variants</span>
                  <div className="flex flex-wrap gap-1">
                    {variants.map(v => {
                      const sel   = runVariants[v.id]
                      const label = sel ? getVariantLeafLabel(sys, v.id, sel) : '—'
                      return (
                        <span key={v.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold ${sel ? 'bg-surface-100 border-surface-200 text-ink' : 'bg-surface-50 border-surface-100 text-ink-faint'}`}>
                          {v.icon && <span>{v.icon}</span>}
                          {v.name}: <span className={sel ? 'text-primary' : ''}>{label}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Material rows */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: hasPrice ? 720 : 560 }}>
                <thead>
                  <tr className="border-b border-surface-100 bg-white">
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-faint w-44">Material</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-faint w-24">Rule</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Formula</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-faint w-16">Raw</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-faint w-20">Qty</th>
                    {hasPrice && <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-faint w-20">Unit $</th>}
                    {hasPrice && <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-faint w-22">Total</th>}
                  </tr>
                </thead>
                <tbody>
                  {combined.map((mat: any, mi: number) => {
                    const pr = mat.perRun?.[ri]
                    const isBracketOnly = mat._isBracketMat && (!pr || pr.unitQty === 0)
                    const ar        = pr?.activeRow
                    const displayQty = isBracketOnly ? (ri === 0 ? (mat._bracketQty ?? mat.grandTotal) : 0) : (pr?.unitQty ?? 0)
                    const lineTotal = mat.unitPrice != null ? mat.unitPrice * displayQty : null
                    if (!pr && !isBracketOnly) return null
                    return (
                      <tr key={mat.id} className={(mi % 2 === 0 ? 'bg-white' : 'bg-surface-50') + ' border-b border-surface-100 last:border-0'}>
                        <td className="px-4 py-2 font-medium text-ink truncate max-w-44">
                          {mat.name}
                          {mat._bracketSource && <div className="text-[9px] text-violet-600 font-semibold">🔩 {mat._bracketSource}</div>}
                        </td>
                        <td className="px-3 py-2 font-mono text-ink-muted text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-surface-100 text-ink-muted text-[10px]">
                            {isBracketOnly ? 'Bracket' : (RULE_LABELS[ar?.ruleType] ?? ar?.ruleType ?? '—')}
                          </span>
                        </td>
                        <td className="px-3 py-2">{isBracketOnly
                          ? <span className="text-[11px] text-violet-600 italic">from bracket BOM</span>
                          : <FormulaCell activeRow={ar} dims={dims} sys={sys} />}</td>
                        <td className="px-3 py-2 text-right font-mono text-ink-muted text-[11px]">{isBracketOnly ? '—' : (pr?.raw ?? 0)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-primary">{displayQty} <span className="text-[10px] font-normal text-ink-faint">{mat.unit}</span></td>
                        {hasPrice && <td className="px-3 py-2 text-right font-mono text-ink-muted text-[11px]">{mat.unitPrice != null ? `$${mat.unitPrice.toFixed(2)}` : '—'}</td>}
                        {hasPrice && <td className="px-3 py-2 text-right font-semibold text-emerald-700 text-[11px]">{lineTotal != null ? `$${lineTotal.toFixed(2)}` : '—'}</td>}
                      </tr>
                    )
                  })}
                </tbody>
                {hasPrice && (() => {
                  const runTotal = combined.reduce((sum: number, mat: any) => {
                    const pr = mat.perRun?.[ri]
                    return sum + (mat.unitPrice != null && pr ? mat.unitPrice * pr.unitQty : 0)
                  }, 0)
                  return runTotal > 0 ? (
                    <tfoot>
                      <tr className="border-t border-surface-200 bg-surface-50">
                        <td colSpan={5} className="px-4 py-1.5 text-right text-[10px] text-ink-faint">Run total</td>
                        <td className="px-3 py-1.5 text-right text-[10px] text-ink-faint"></td>
                        <td className="px-3 py-1.5 text-right font-semibold text-emerald-700 text-[11px]">${runTotal.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  ) : null
                })()}
              </table>
            </div>
          </div>
        )
      })}

      {/* Work Schedule section */}
      {workSchedule && (() => {
        const phases = Object.entries(workSchedule.byPhase).filter(([, items]) => (items as WorkScheduleResult[]).length > 0)
        if (!phases.length) return null
        return (
          <div className="border-t border-surface-200">
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <span className="text-xs font-semibold text-ink">Work Schedule</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: 520 }}>
                <thead>
                  <tr className="border-b border-surface-100 bg-white">
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-faint w-28">Phase</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Activity</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-faint w-20">Qty</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-faint w-20">Time/Unit</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-faint w-20">Hours</th>
                    {workSchedule.totalLabourCost != null && <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-faint w-22">Labour $</th>}
                  </tr>
                </thead>
                <tbody>
                  {phases.flatMap(([phase, items], pi) =>
                    (items as WorkScheduleResult[]).map((item, ii) => (
                      <tr key={`${pi}-${ii}`} className={((pi + ii) % 2 === 0 ? 'bg-white' : 'bg-surface-50') + ' border-b border-surface-100 last:border-0'}>
                        <td className="px-4 py-2 text-ink-muted text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-surface-100 text-ink-faint text-[10px]">{PHASE_LABELS[phase] ?? phase}</span>
                        </td>
                        <td className="px-3 py-2 font-medium text-ink">{item.activityName}</td>
                        <td className="px-3 py-2 text-right font-mono text-ink-muted text-[11px]">{item.sourceQty} <span className="text-[10px] text-ink-faint">{item.sourceUnit}</span></td>
                        <td className="px-3 py-2 text-right font-mono text-ink-muted text-[11px]">{item.timePerUnit.toFixed(1)} min</td>
                        <td className="px-3 py-2 text-right font-semibold text-primary text-[11px]">{item.totalHours.toFixed(2)} hr</td>
                        {workSchedule.totalLabourCost != null && <td className="px-3 py-2 text-right font-mono text-emerald-700 text-[11px]">{item.labourCost != null ? `$${item.labourCost.toFixed(2)}` : '—'}</td>}
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-surface-200 bg-surface-50">
                    <td colSpan={4} className="px-4 py-1.5 text-right text-[10px] text-ink-faint">Total hours</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-primary text-[11px]">{workSchedule.totalElapsedHours.toFixed(2)} hr</td>
                    {workSchedule.totalLabourCost != null && <td className="px-3 py-1.5 text-right font-semibold text-emerald-700 text-[11px]">${workSchedule.totalLabourCost.toFixed(2)}</td>}
                  </tr>
                  {workSchedule.totalThirdPartyCost != null && (
                    <tr className="bg-surface-50">
                      <td colSpan={4} className="px-4 py-1.5 text-right text-[10px] text-ink-faint">Third party cost</td>
                      <td></td>
                      <td className="px-3 py-1.5 text-right font-semibold text-emerald-700 text-[11px]">${workSchedule.totalThirdPartyCost.toFixed(2)}</td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

const SEG_TYPES = [
  { value: 'end_corner',    label: 'End→Cor',  ends: 1, corners: 1 },
  { value: 'corner_end',    label: 'Cor→End',  ends: 1, corners: 1 },
  { value: 'corner_corner', label: 'Cor→Cor',  ends: 0, corners: 2 },
  { value: 'end_end',       label: 'End→End',  ends: 2, corners: 0 },
]

function SegmentEditor({ segments, onChange }: { segments: Segment[]; onChange: (s: Segment[]) => void }) {
  const add    = () => onChange([...segments, { id: nanoid(), type: 'end_corner', length: '', spacing: '' }])
  const update = (id: string, k: keyof Segment, v: string) => onChange(segments.map(s => s.id === id ? { ...s, [k]: v } : s))
  const remove = (id: string) => onChange(segments.filter(s => s.id !== id))
  const totals = segments.reduce((acc, seg) => {
    const st = SEG_TYPES.find(t => t.value === seg.type)
    return { length: acc.length + (parseFloat(seg.length) || 0), ends: acc.ends + (st?.ends ?? 0), corners: acc.corners + (st?.corners ?? 0) }
  }, { length: 0, ends: 0, corners: 0 })
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-semibold uppercase text-ink-faint tracking-wide">Run segments</span>
        <button onClick={add} className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      {segments.map((seg) => {
        const st = SEG_TYPES.find(t => t.value === seg.type) ?? SEG_TYPES[0]
        return (
          <div key={seg.id} className="bg-surface-50 dark:bg-surface-100 border border-surface-200 overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
            <div className="flex">
              {SEG_TYPES.map(t => (
                <button key={t.value} onClick={() => update(seg.id, 'type', t.value)}
                  className={"flex-1 py-1.5 text-[10px] font-semibold transition-all border-r border-surface-200 last:border-r-0 " + (seg.type === t.value ? 'bg-secondary text-white' : 'text-secondary-600 hover:bg-secondary-50')}>
                  {t.label}
                </button>
              ))}
              <button onClick={() => remove(seg.id)} className="px-2 text-ink-faint hover:text-red-500 border-l border-surface-200">×</button>
            </div>
            <div className="flex gap-2 p-2">
              <div className="flex flex-col gap-0.5 flex-1">
                <span className="text-[9px] font-semibold uppercase text-ink-faint">Length</span>
                <div className="relative">
                  <input type="number" value={seg.length} min={0} step="0.1" placeholder="0"
                    onChange={e => update(seg.id, 'length', e.target.value)}
                    className="input text-xs py-1 pr-6 font-semibold"
                    style={{ borderColor: parseFloat(seg.length) > 0 ? '#22c55e' : 'var(--color-secondary-200)' }} />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-ink-faint">m</span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 w-20">
                <span className="text-[9px] font-semibold uppercase text-ink-faint">Spacing</span>
                <div className="relative">
                  <input type="number" value={seg.spacing} min={0} step="0.1" placeholder="default"
                    onChange={e => update(seg.id, 'spacing', e.target.value)}
                    className="input text-xs py-1 pr-6"
                    style={{ borderColor: parseFloat(seg.spacing) > 0 ? '#fcd34d' : undefined }} />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-ink-faint">m</span>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-0.5">
                {st.ends > 0    && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">+{st.ends}e</span>}
                {st.corners > 0 && <span className="text-[9px] bg-surface-200 text-ink-muted px-1.5 py-0.5 rounded font-semibold">+{st.corners}c</span>}
              </div>
            </div>
          </div>
        )
      })}
      {segments.length > 0 && (
        <div className="flex gap-3 bg-surface-100 rounded-lg px-3 py-2 text-xs font-semibold text-ink-muted">
          <span>📏 {totals.length.toFixed(1)}m</span>
          <span>📍 {totals.ends} ends</span>
          <span>📐 {totals.corners} corners</span>
        </div>
      )}
    </div>
  )
}

function VariantSelector({ sys, run, onUpdate }: { sys: MtoSystem; run: Run; onUpdate: (patch: Partial<Run>) => void }) {
  if (!sys.variants?.length) return null
  const getLeaves = (nodes: any[], path: string[] = []): { key: string; label: string }[] =>
    nodes.flatMap(n => (n.children?.length ?? 0) === 0
      ? [{ key: n.key, label: [...path, n.label].join(' › ') }]
      : getLeaves(n.children, [...path, n.label]))
  return (
    <div className="space-y-2">
      {sys.variants.map(v => {
        const leaves  = getLeaves(v.nodes)
        const current = (run.variantState ?? {})[v.id] ?? ''
        return (
          <div key={v.id}>
            <div className="text-[9px] font-semibold uppercase text-secondary-600 mb-1"><span className="mr-1">{v.icon}</span>{v.name}</div>
            <div className="flex flex-wrap gap-1">
              {leaves.map(leaf => (
                <button key={leaf.key}
                  onClick={() => onUpdate({ variantState: { ...(run.variantState ?? {}), [v.id]: current === leaf.key ? '' : leaf.key } })}
                  className={"text-[10px] px-2 py-0.5 border transition-all " + (current !== leaf.key ? 'bg-secondary-50 border-secondary-200 text-secondary-700' : '')}
                  style={{ borderRadius: 'var(--radius)', ...(current === leaf.key ? { background: v.color + '20', borderColor: v.color + '60', color: v.color, fontWeight: 600 } : {}) }}>
                  {leaf.label}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const PHASE_LABELS: Record<ActivityPhase, { label: string; icon: string; color: string }> = {
  fabrication:   { label: 'Fabrication',   icon: '🔧', color: '#7c3aed' },
  installation:  { label: 'Installation',  icon: '🏗️', color: '#0284c7' },
  commissioning: { label: 'Commissioning', icon: '✅', color: '#16a34a' },
  transport:     { label: 'Transport',     icon: '🚛', color: '#ca8a04' },
  third_party:   { label: 'Third Party',   icon: '🤝', color: '#9f1239' },
}

function PhaseCard({ phase, results, showCost, currency }: {
  phase: ActivityPhase
  results: WorkScheduleSummary['byPhase'][string]
  showCost: boolean
  currency: string
}) {
  const [open, setOpen] = useState(true)
  const info      = PHASE_LABELS[phase]
  const phaseHours = results.reduce((s, r) => s + r.totalHours, 0)
  const phaseCost  = showCost ? results.reduce((s, r) => s + (r.labourCost ?? r.thirdPartyCost ?? 0), 0) : null

  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 flex items-center justify-between hover:opacity-90 transition-opacity"
        style={{ background: info.color + '12' }}>
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{info.icon}</span>
          <span className="font-semibold text-sm" style={{ color: info.color }}>{info.label}</span>
          <span className="text-xs font-semibold text-ink-muted">
            {phaseHours.toFixed(1)} hrs
            {phaseCost != null && phaseCost > 0 && ` · ${currency}${phaseCost.toFixed(0)}`}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-ink-faint" /> : <ChevronDown className="w-4 h-4 text-ink-faint" />}
      </button>
      {open && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-surface-200 bg-surface-50 text-ink-muted">
              <th className="px-4 py-2 text-left font-semibold">Activity</th>
              <th className="px-3 py-2 text-right font-semibold">Qty</th>
              <th className="px-3 py-2 text-right font-semibold">Time</th>
              {showCost && <th className="px-3 py-2 text-right font-semibold">Cost</th>}
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r.activityId} className="border-b border-surface-100 last:border-0 hover:bg-surface-50">
                <td className="px-4 py-2.5 text-ink font-medium">{r.activityName}</td>
                <td className="px-3 py-2.5 text-right font-mono text-ink-muted whitespace-nowrap">
                  {r.sourceQty} {r.sourceUnit}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-semibold text-ink whitespace-nowrap">
                  {r.isThirdParty
                    ? (r.thirdPartyCost != null ? `${currency}${r.thirdPartyCost.toFixed(0)}` : '—')
                    : `${r.totalHours.toFixed(2)} hr`}
                </td>
                {showCost && (
                  <td className="px-3 py-2.5 text-right font-mono text-ink-muted whitespace-nowrap">
                    {r.labourCost != null ? `${currency}${r.labourCost.toFixed(0)}` : r.thirdPartyCost != null ? `${currency}${r.thirdPartyCost.toFixed(0)}` : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-surface-200 bg-surface-50">
              <td className="px-4 py-2 font-semibold text-ink" colSpan={2}>Phase total</td>
              <td className="px-3 py-2 text-right font-semibold font-mono" style={{ color: info.color }}>
                {phaseHours.toFixed(1)} hr
              </td>
              {showCost && (
                <td className="px-3 py-2 text-right font-semibold font-mono text-green-700">
                  {phaseCost != null && phaseCost > 0 ? `${currency}${phaseCost.toFixed(0)}` : '—'}
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}

function WorkScheduleSection({ schedule, showCost, currency }: { schedule: WorkScheduleSummary; showCost: boolean; currency?: string }) {
  const cur = currency ?? 'S$'
  const activePhases = (Object.entries(schedule.byPhase) as [ActivityPhase, typeof schedule.byPhase[string]][])
    .filter(([, results]) => results.length > 0)
  if (!activePhases.length) return null

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-ink-muted" />
          <span className="font-semibold text-sm text-ink">Work Schedule</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono font-semibold text-ink-muted">
          {schedule.totalFabHours > 0    && <span className="text-violet-600">🔧 {schedule.totalFabHours.toFixed(1)} hr fab</span>}
          {schedule.totalInstallHours > 0 && <span className="text-sky-600">🏗️ {schedule.totalInstallHours.toFixed(1)} hr install</span>}
          <span className="text-primary font-semibold">{schedule.totalElapsedHours.toFixed(1)} hr total</span>
          {showCost && schedule.totalLabourCost != null && (
            <span className="text-green-700">{cur}{(schedule.totalLabourCost + (schedule.totalThirdPartyCost ?? 0)).toFixed(0)}</span>
          )}
        </div>
      </div>

      {/* One card per phase */}
      {activePhases.map(([phase, results]) => (
        <PhaseCard key={phase} phase={phase} results={results} showCost={showCost} currency={cur} />
      ))}
    </div>
  )
}

// ─── Step wrapper (mirrors SetupTab StepHeader) ───────────────────────────────

const CALC_STEPS = [
  { n: 1, color: '#3b82f6', label: 'Runs',      desc: 'Enter dimensions, conditions and variants for each location' },
  { n: 2, color: '#7c3aed', label: 'Calculate', desc: 'Run the material takeoff' },
  { n: 3, color: '#16a34a', label: 'Results',   desc: 'Calculated material quantities and costs' },
]

function CalcStep({ n, children }: { n: number; children: React.ReactNode }) {
  const step = CALC_STEPS[n - 1]
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-5 h-5 flex items-center justify-center text-[10px] font-semibold text-ink-muted bg-surface-100 border border-surface-200 flex-shrink-0"
          style={{ borderRadius: 'var(--radius)' }}>
          {step.n}
        </div>
        <span className="text-xs font-semibold text-ink">{step.label}</span>
        <span className="text-xs text-ink-faint">— {step.desc}</span>
        <div className="flex-1 h-px bg-surface-200" />
      </div>
      <div className="space-y-3 pl-3.5 border-l-2 border-surface-200">
        {children}
      </div>
    </div>
  )
}

// ─── Field Guide for Calculator ──────────────────────────────────────────────
const CALC_GUIDE_ITEMS = [
  { label: 'Runs', desc: 'Each run represents a separate location or area. Enter dimensions, toggle conditions, and select variants for each.' },
  { label: 'Qty multiplier', desc: 'The ×N on each run multiplies all material quantities — use for identical repeated locations.' },
  { label: 'Conditions', desc: 'Toggle criteria gates ON/OFF per run. Materials gated by a condition are excluded when it\'s OFF.' },
  { label: 'Variants', desc: 'Select the variant leaf for each run. Material rules can target specific variant paths.' },
  { label: 'Stock optimisation', desc: 'Min waste = fewest offcuts. Min sections = fewest total pieces. Only applies to stock-length dims.' },
  { label: 'Results table', desc: 'Shows per-run quantities (unit × qty) and grand totals. Prices come from material unit costs set in Setup.' },
  { label: 'Calculation breakdown', desc: 'Expand to see the exact formula, rule type, and raw → rounded values for every material in every run.' },
]

function CalcFieldGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="card overflow-hidden border-primary/20 border animate-fade-in">
      <div className="px-4 py-3 bg-primary/5 border-b border-primary/10 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-ink flex-1">Calculator Field Guide</span>
        <button onClick={onClose} className="text-ink-faint hover:text-ink"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {CALC_GUIDE_ITEMS.map(item => (
          <div key={item.label}>
            <div className="text-xs font-semibold text-ink mb-0.5">{item.label}</div>
            <div className="text-[10px] text-ink-faint italic leading-snug">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CalculatorTab({ sys, jobs, onSaveJob, onRunCalc, plan = 'FREE' }: Props) {
  const router  = useRouter()
  const calc    = useCalcStore()
  const limits  = getLimits(plan)
  const [jobName,        setJobName]       = useState('')
  const [saving,         setSaving]        = useState(false)
  const [showJobs,       setShowJobs]      = useState(false)
  const [stockMode,      setStockMode]     = useState<'min_waste' | 'min_sections'>('min_waste')
  const [showBreakdown,  setShowBreakdown] = useState(false)
  const [collapsedRuns, setCollapsedRuns] = useState<Set<string>>(new Set())
  const toggleRunCollapse = (id: string) => setCollapsedRuns(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const [showOverview, setShowOverview] = useState(false)
  const [showFieldGuide, setShowFieldGuide] = useState(false)

  const runsAtLimit  = limits.maxRuns !== -1 && calc.runs.length >= limits.maxRuns
  const spacingDims  = (sys.customDims ?? []).filter(cd => cd.derivType === 'spacing' && cd.spacingMode === 'user')
  const userInputDims = (sys.customDims ?? []).filter(cd => cd.derivType === 'user_input')

  // ── Merge bracket BOM materials into combined results ────────────────────
  const combinedWithBrackets: any[] = (() => {
    const combined = [...(calc.multiResults?.combined ?? [])]
    const brackets = sys.customBrackets ?? []
    if (!calc.multiResults || brackets.length === 0) return combined

    // Compute bracket quantities per-run so run.qty multipliers are respected
    const perRunBracketBOM: { runIndex: number; runQty: number; materialId: string; qty: number; unit: string; bracket: typeof brackets[0] }[] = []
    for (let ri = 0; ri < calc.runs.length; ri++) {
      const run = calc.runs[ri]
      const runQty = run.qty || 1
      const jobDims: Record<string, number> = {}
      const job = { ...(run.job ?? {}), ...(run.simpleJob ?? {}) } as Record<string, any>
      for (const [k, v] of Object.entries(job)) {
        jobDims[k] = parseFloat(String(v)) || 0
      }
      // Handle linear_run simple mode dims
      if ((sys.inputModel === 'linear_run' || sys.inputModel === 'linear') && run.inputMode === 'simple') {
        jobDims.length    = parseFloat(run.simpleJob?.length as any) || 0
        jobDims.corners   = 0
        const isLoop      = !!(run.criteriaState ?? {} as any)['loop']
        jobDims.end1      = isLoop ? 0 : 1
        jobDims.end2      = isLoop ? 0 : 1
        jobDims.both_ends = isLoop ? 0 : 2
        jobDims['__spacing_int_brackets'] = parseFloat(run.simpleJob?.spacing as any) || 10
      }
      const criteriaState = run.criteriaState ?? {}
      const variantState  = run.variantState  ?? {}
      const bracketQtys = computeBracketQtys(brackets, jobDims, sys, criteriaState, variantState)
      for (const bracket of brackets) {
        const bQty = bracketQtys[bracket.id] ?? 0
        if (bQty <= 0) continue
        const params = Object.fromEntries((bracket.parameters ?? []).map(p => [p.key, p.default]))
        const expanded = computeBracketBOM(bracket, bQty, params)
        for (const item of expanded) {
          if (!item.materialId) continue
          perRunBracketBOM.push({ runIndex: ri, runQty, materialId: item.materialId, qty: Math.ceil(item.qty), unit: item.unit, bracket })
        }
      }
    }

    // Aggregate bracket BOM items into combined results
    for (const entry of perRunBracketBOM) {
      const { runIndex, runQty, materialId, qty, unit, bracket } = entry
      const sysMat  = sys.materials.find(m => m.id === materialId)
      const bomItem = bracket.bom.find((b: any) => b.materialId === materialId)
      const name    = sysMat?.name ?? (bomItem as any)?.customName ?? '(unknown)'
      const matUnit = unit || sysMat?.unit || 'pcs'

      let existing = combined.find(c => c.id === materialId)
      if (!existing) {
        const perRun = calc.runs.map((r: Run) => ({
          runId: r.id, runName: r.name, runQty: r.qty || 1,
          unitQty: 0, totalQty: 0, blocked: false, blockedBy: [],
          activeRow: null, raw: 0, solverResults: {},
        }))
        existing = {
          id: materialId, name, unit: matUnit,
          productCode: sysMat?.productCode ?? '', photo: sysMat?.photo ?? null,
          unitPrice: (sysMat as any)?.unitPrice ?? null,
          perRun, grandTotal: 0, allBlocked: false,
          _isBracketMat: true, _bracketQty: 0,
          _bracketSource: '',
        }
        combined.push(existing)
      }
      // Update per-run breakdown
      const pr = existing.perRun[runIndex]
      if (pr) {
        pr.unitQty  += qty
        pr.totalQty += qty * runQty
      }
      existing.grandTotal  += qty * runQty
      existing._bracketQty  = (existing._bracketQty ?? 0) + qty * runQty
      if (!(existing._bracketSource ?? '').includes(bracket.name)) {
        existing._bracketSource = (existing._bracketSource ?? '') + (existing._bracketSource ? ', ' : '') + bracket.icon + ' ' + bracket.name
      }
    }
    return combined
  })()

  // Compute work schedule when results are available
  const workSchedule: WorkScheduleSummary | null = (() => {
    if (!calc.multiResults || !(sys.workActivities?.length)) return null
    const dimValues: Record<string, number> = {}
    for (const run of calc.runs) {
      const job = { ...(run.job ?? {}), ...(run.simpleJob ?? {}) } as Record<string, any>
      for (const [k, v] of Object.entries(job)) {
        dimValues[k] = (dimValues[k] ?? 0) + (parseFloat(String(v)) || 0)
      }
    }
    const mergedCriteria = calc.runs.reduce((acc: Record<string, boolean>, r: Run) => {
      for (const [k, v] of Object.entries(r.criteriaState ?? {})) { if (v) acc[k] = true }
      return acc
    }, {} as Record<string, boolean>)
    const mergedVariants = calc.runs.reduce((acc: Record<string, string>, r: Run) => {
      return { ...acc, ...(r.variantState ?? {}) }
    }, {} as Record<string, string>)
    const brackets    = sys.customBrackets ?? []
    const bracketQtys = computeBracketQtys(brackets, dimValues, sys, mergedCriteria, mergedVariants)
    return computeWorkSchedule(
      sys.workActivities ?? [],
      combinedWithBrackets,
      dimValues,
      mergedCriteria,
      calc.runs.length,
      limits.pricing ?? false,
      brackets,
      bracketQtys,
    )
  })()

  // Total run length for rate calculations
  const totalRunLength = calc.runs.reduce((sum: number, run: Run) => {
    if ((sys.inputModel === 'linear_run' || sys.inputModel === 'linear')) {
      if (run.inputMode === 'segment') {
        return sum + (run.segments ?? []).reduce((s: number, seg: Segment) => s + (parseFloat(seg.length) || 0), 0) * run.qty
      }
      return sum + (parseFloat(run.simpleJob?.length ?? '0') || 0) * run.qty
    }
    return sum + (parseFloat((run.job as any)?.length ?? '0') || 0) * run.qty
  }, 0)

  const handleSave = async () => {
    if (!jobName.trim()) return
    setSaving(true)
    const lastResults = calc.multiResults ? buildLastResults(sys, calc.runs, { ...calc.multiResults, combined: combinedWithBrackets }, workSchedule) : null
    await onSaveJob(jobName.trim(), lastResults)
    setJobName(''); setSaving(false)
  }

  const handleLoadJob = (job: any) => {
    const runs = (job.runs ?? []).map((r: any) => ({
      ...r,
      criteriaState: r.criteriaState ?? job.criteriaState ?? {},
      variantState:  r.variantState  ?? job.variantState  ?? {},
    }))
    calc.setRuns(runs)
    calc.setStockOptimMode(job.stockOptimMode ?? 'min_waste')
    calc.setMultiResults(null)
    calc.setLastCalc(job.calculatedAt ?? Date.now(), job.matVersions ?? {})
    setShowJobs(false)
    onRunCalc()
  }

  const driftedMats = calc.lastCalcVersions && calc.lastCalcAt
    ? sys.materials.filter(m => { const s = calc.lastCalcVersions[m.id]; return s !== undefined && (m._updatedAt ?? 0) > s })
    : []

  return (
    <div className="flex flex-col gap-6 items-start relative">
      <div className="w-full flex-shrink-0 space-y-5">

        <CalcStep n={1}>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
              Runs ({calc.runs.length}{limits.maxRuns !== -1 ? '/' + limits.maxRuns : ''})
            </h3>
            {runsAtLimit
              ? <button onClick={() => router.push('/billing')} className="text-[10px] text-primary font-semibold flex items-center gap-1"><Lock className="w-3 h-3" /> Upgrade</button>
              : <button onClick={() => calc.addRun()} className="btn-ghost text-xs py-1 px-2 text-primary"><Plus className="w-3.5 h-3.5" /> Add</button>}
          </div>
          <p className="text-[10px] text-ink-faint mb-3">Each run is a separate location or area. Enter dimensions, then click Calculate.</p>
          {runsAtLimit && limits.maxRuns !== -1 && (
            <UpgradePrompt feature={'More than ' + limits.maxRuns + ' run' + (limits.maxRuns !== 1 ? 's' : '')} upgradeTo="PRO" compact />
          )}
          <div className="space-y-3">
            {calc.runs.map((run, ri) => (
              <div key={run.id} className={`border overflow-hidden ${collapsedRuns.has(run.id) ? 'border-surface-200 bg-surface-50' : 'border-secondary-200 bg-secondary-50/20'}`} style={{ borderRadius: 'var(--radius-card)' }}>
                {/* Run header — always visible */}
                <div className="flex items-center gap-2 px-3 py-2 border-b bg-secondary-100 border-secondary-200">
                  <span className="text-xs font-black text-secondary-700 w-5 flex-shrink-0">#{ri + 1}</span>
                  <input value={run.name} onChange={e => calc.updateRun(run.id, { name: e.target.value })}
                    className="flex-1 bg-transparent text-xs font-semibold text-secondary-900 outline-none min-w-0 placeholder-secondary-600 border-b border-dashed border-secondary-200 focus:border-solid focus:border-secondary-300 transition-colors"
                    placeholder="Run name…" />
                  <div className="flex items-center gap-1 text-xs text-secondary-700 flex-shrink-0">
                    <span className="text-[10px] text-secondary-600">×</span>
                    <input type="number" value={run.qty} min={1}
                      onChange={e => calc.updateRun(run.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-10 text-center border rounded text-xs font-semibold py-0.5 outline-none focus:ring-1 bg-secondary-50 border-secondary-200 text-secondary-900" />
                  </div>
                  <button onClick={() => calc.duplicateRun(run.id)} className="text-secondary-600 hover:text-secondary-700 flex-shrink-0"><Copy className="w-3.5 h-3.5" /></button>
                  {calc.runs.length > 1 && <button onClick={() => calc.removeRun(run.id)} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>}
                  <button onClick={() => toggleRunCollapse(run.id)} className="text-secondary-600 hover:text-secondary-700 flex-shrink-0">
                    {collapsedRuns.has(run.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Run body — collapsible */}
                {!collapsedRuns.has(run.id) && (
                  <div className="p-3 space-y-3">

                    {/* Criteria (per-run) */}
                    {sys.customCriteria?.filter(c => c.type === 'input').length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[9px] font-semibold uppercase text-secondary-600 tracking-wide">Conditions</div>
                        {sys.customCriteria.filter(c => c.type === 'input').map(cr => {
                          const isOn = (run.criteriaState ?? {})[cr.key] === true
                          return (
                            <div key={cr.key} className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm leading-none">{cr.icon}</span>
                                <div>
                                  <div className="text-xs font-medium text-ink">{cr.name}</div>
                                  {cr.description && <div className="text-[10px] text-ink-faint">{cr.description}</div>}
                                </div>
                              </div>
                              <button
                                onClick={() => calc.updateRun(run.id, { criteriaState: { ...(run.criteriaState ?? {}), [cr.key]: !isOn } })}
                                style={{ background: isOn ? cr.color : undefined }}
                                className={"relative w-10 h-5 rounded-full transition-colors flex-shrink-0 border " + (isOn ? 'border-transparent' : 'bg-surface-200 border-surface-300')}>
                                <span className={"absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all " + (isOn ? 'left-[22px]' : 'left-0.5')} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Variants (per-run) */}
                    {sys.variants?.length > 0 && (
                      <VariantSelector sys={sys} run={run} onUpdate={patch => calc.updateRun(run.id, patch)} />
                    )}

                    {(sys.inputModel === 'linear_run' || sys.inputModel === 'linear') && (
                      <div className="flex gap-0 rounded-lg overflow-hidden border border-secondary-200">
                        {([['simple', '📐 Simple'], ['segment', '🗺 Segments']] as const).map(([mode, label], i) => (
                          <button key={mode} onClick={() => calc.updateRun(run.id, { inputMode: mode })}
                            className={'flex-1 py-1.5 text-xs font-semibold ' + (i > 0 ? 'border-l border-secondary-200 ' : '') + (run.inputMode === mode ? 'bg-secondary text-white' : 'bg-secondary-50 text-secondary-700')}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}

                    {sys.inputModel === 'area' && (
                      <div className="grid grid-cols-2 gap-2">
                        {[{ key: 'length', label: 'Length', unit: 'm' }, { key: 'width', label: 'Width', unit: 'm' }].map(f => (
                          <div key={f.key}>
                            <div className="text-[9px] font-semibold uppercase text-secondary-600 mb-1">{f.label}</div>
                            <div className="relative">
                              <input type="number" value={(run.job as any)[f.key] ?? ''} min={0} step="0.1" placeholder="0"
                                onChange={e => calc.updateRun(run.id, { job: { ...run.job, [f.key]: e.target.value } })}
                                className="input text-xs py-1.5 pr-7"
                                style={{ borderColor: parseFloat((run.job as any)[f.key]) > 0 ? '#22c55e' : 'var(--color-secondary-200)' }} />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-secondary-600">{f.unit}</span>
                            </div>
                          </div>
                        ))}
                        {userInputDims.map(cd => (
                          <div key={cd.key}>
                            <div className="text-[9px] font-semibold uppercase text-secondary-600 mb-1">
                              {cd.icon} {cd.name}{cd.unit ? ` (${cd.unit})` : ''}
                            </div>
                            <div className="relative">
                              <input type="number" value={(run.job as any)[cd.key] ?? ''} min={0} step={String(cd.inputStep ?? 1)} placeholder="0"
                                onChange={e => calc.updateRun(run.id, { job: { ...run.job, [cd.key]: e.target.value } })}
                                className="input text-xs py-1.5 pr-7"
                                style={{ borderColor: parseFloat((run.job as any)[cd.key]) > 0 ? '#22c55e' : 'var(--color-secondary-200)' }} />
                              {cd.unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-secondary-600">{cd.unit}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!['linear_run','linear','area'].includes(sys.inputModel) && (
                      <div className="grid grid-cols-2 gap-2">
                        {(DIMS_FOR_INPUT_MODEL[sys.inputModel] ?? PRIMITIVE_DIMS.map(p => p.key)).filter(key => {
                          // Always show dims defined by the input model
                          const modelDims = DIMS_FOR_INPUT_MODEL[sys.inputModel]
                          if (modelDims?.includes(key)) return true
                          // For legacy/unknown: only show dims actively referenced
                          const cds = sys.customDims ?? []
                          return cds.some(cd => cd.derivType === 'stock_length' && cd.stockTargetDim === key)
                              || cds.some(cd => cd.derivType === 'spacing'      && cd.spacingTargetDim === key)
                              || cds.some(cd => cd.derivType === 'formula'      && cd.formulaDimKey === key)
                              || sys.materials.some(m => (m.ruleSet ?? []).some(r => r.ruleDimKey === key))
                        }).map(key => {
                          const dimDef = PRIMITIVE_DIMS.find(p => p.key === key)
                          return (
                          <div key={key}>
                            <div className="text-[9px] font-semibold uppercase text-secondary-600 mb-1">{dimDef?.icon} {dimDef?.label ?? key}</div>
                            <div className="relative">
                              <input type="number" value={(run.job as any)[key] ?? ''} min={0} step="0.1" placeholder="0"
                                onChange={e => calc.updateRun(run.id, { job: { ...run.job, [key]: e.target.value } })}
                                className="input text-xs py-1.5 pr-7"
                                style={{ borderColor: parseFloat((run.job as any)[key]) > 0 ? '#22c55e' : 'var(--color-secondary-200)' }} />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-secondary-600">
                                {dimDef?.unit ?? ''}
                              </span>
                            </div>
                          </div>
                        )})}
                        {spacingDims.map(cd => (
                          <div key={cd.key}>
                            <div className="text-[9px] font-semibold uppercase text-ink-faint mb-1">{cd.spacingLabel || cd.name} <span className="text-secondary-600">(spacing)</span></div>
                            <div className="relative">
                              <input type="number" value={(run.job as any)['__spacing_' + cd.key] ?? ''} min={0.1} step="0.1" placeholder={String(cd.spacing ?? 1)}
                                onChange={e => calc.updateRun(run.id, { job: { ...run.job, ['__spacing_' + cd.key]: e.target.value } })}
                                className="input text-xs py-1.5 pr-7"
                                style={{ borderColor: parseFloat((run.job as any)['__spacing_' + cd.key]) > 0 ? '#a78bfa' : '#fcd34d' }} />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-secondary-600">m</span>
                            </div>
                          </div>
                        ))}
                        {userInputDims.map(cd => (
                          <div key={cd.key}>
                            <div className="text-[9px] font-semibold uppercase text-secondary-600 mb-1">
                              {cd.icon} {cd.name}{cd.unit ? ` (${cd.unit})` : ''}
                            </div>
                            <div className="relative">
                              <input type="number" value={(run.job as any)[cd.key] ?? ''} min={0} step={String(cd.inputStep ?? 1)} placeholder="0"
                                onChange={e => calc.updateRun(run.id, { job: { ...run.job, [cd.key]: e.target.value } })}
                                className="input text-xs py-1.5 pr-7"
                                style={{ borderColor: parseFloat((run.job as any)[cd.key]) > 0 ? '#22c55e' : 'var(--color-secondary-200)' }} />
                              {cd.unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-secondary-600">{cd.unit}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(sys.inputModel === 'linear_run' || sys.inputModel === 'linear') && run.inputMode === 'simple' && (
                      <div className="grid grid-cols-2 gap-2">
                        {[{key:'length',label:'Length',unit:'m'},{key:'spacing',label:'Bracket Spacing',unit:'m'}].map(f => (
                          <div key={f.key}>
                            <div className="text-[9px] font-semibold uppercase text-secondary-600 mb-1">{f.label}</div>
                            <div className="relative">
                              <input type="number" value={(run.simpleJob as any)[f.key] ?? ''} min={0} step="0.1" placeholder="0"
                                onChange={e => calc.updateRun(run.id, { simpleJob: { ...run.simpleJob, [f.key]: e.target.value } as any })}
                                className="input text-xs py-1.5"
                                style={{ borderColor: parseFloat((run.simpleJob as any)[f.key]) > 0 ? '#22c55e' : 'var(--color-secondary-200)' }} />
                              {f.unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-secondary-600">{f.unit}</span>}
                            </div>
                          </div>
                        ))}
                        {spacingDims.map(cd => (
                          <div key={cd.key}>
                            <div className="text-[9px] font-semibold uppercase text-ink-faint mb-1">{cd.spacingLabel || cd.name} <span className="text-secondary-600">(spacing)</span></div>
                            <div className="relative">
                              <input type="number" value={(run.job as any)['__spacing_' + cd.key] ?? ''} min={0.1} step="0.1" placeholder={String(cd.spacing ?? 1)}
                                onChange={e => calc.updateRun(run.id, { job: { ...run.job, ['__spacing_' + cd.key]: e.target.value } })}
                                className="input text-xs py-1.5 pr-7" />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-secondary-600">m</span>
                            </div>
                          </div>
                        ))}
                        {userInputDims.map(cd => (
                          <div key={cd.key}>
                            <div className="text-[9px] font-semibold uppercase text-secondary-600 mb-1">
                              {cd.icon} {cd.name}{cd.unit ? ` (${cd.unit})` : ''}
                            </div>
                            <div className="relative">
                              <input type="number" value={(run.job as any)[cd.key] ?? ''} min={0} step={String(cd.inputStep ?? 1)} placeholder="0"
                                onChange={e => calc.updateRun(run.id, { job: { ...run.job, [cd.key]: e.target.value } })}
                                className="input text-xs py-1.5 pr-7"
                                style={{ borderColor: parseFloat((run.job as any)[cd.key]) > 0 ? '#22c55e' : 'var(--color-secondary-200)' }} />
                              {cd.unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-secondary-600">{cd.unit}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(sys.inputModel === 'linear_run' || sys.inputModel === 'linear') && run.inputMode === 'segment' && (
                      <SegmentEditor segments={run.segments ?? []} onChange={segs => calc.updateRun(run.id, { segments: segs })} />
                    )}

                    {(sys.warnings ?? []).map(w => {
                      const job: Record<string, number> = {}
                      const rawJob = { ...(run.job ?? {}), ...(run.simpleJob ?? {}) }
                      for (const [k, v] of Object.entries(rawJob)) job[k] = parseFloat(String(v)) || 0
                      for (const cd of (sys.customDims ?? [])) {
                        if (cd.derivType === 'spacing') {
                          const targetVal = job[cd.spacingTargetDim] ?? 0
                          const spacing   = cd.spacingMode === 'user'
                            ? (job['__spacing_' + cd.key] ?? cd.spacing)
                            : cd.spacing
                          if (spacing > 0) {
                            const count = Math.floor(targetVal / spacing) + (cd.includesEndpoints ? 1 : 0)
                            job[cd.key]               = count
                            job['__spacing_' + cd.key] = spacing
                          }
                        }
                      }
                      const mDims  = new Set(['length','height','width','perimeter'])
                      const dv     = job[w.dimKey] ?? 0
                      const thresh = parseFloat(String(w.threshold))
                      const dvMm   = (mDims.has(w.dimKey) && thresh >= 100) ? dv * 1000 : dv
                      const hit    = w.operator === '>' ? dvMm > thresh : w.operator === '>=' ? dvMm >= thresh : w.operator === '<' ? dvMm < thresh : dvMm <= thresh
                      if (!hit) return null
                      return (
                        <div key={w.key ?? w.dimKey} className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{w.message}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {(sys.customDims ?? []).some(cd => cd.derivType === 'stock_length') && (
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Stock optimisation</h3>
            <div className="flex gap-0 rounded-lg overflow-hidden border border-surface-200">
              {([['min_waste','Min waste'],['min_sections','Min sections']] as const).map(([v,l],i) => (
                <button key={v} onClick={() => { setStockMode(v); calc.setStockOptimMode(v) }}
                  className={'flex-1 py-2 text-xs font-semibold ' + (i > 0 ? 'border-l border-surface-200 ' : '') + (stockMode === v ? 'bg-primary text-white' : 'bg-white text-ink-muted')}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="card p-4">
          <div className="flex gap-2 mb-2">
            <input value={jobName} onChange={e => setJobName(e.target.value)}
              placeholder="Job name…" className="input flex-1 text-sm"
              onKeyDown={e => { if (e.key === 'Enter' && jobName.trim()) handleSave() }} />
            <button onClick={handleSave} disabled={!jobName.trim() || saving} className="btn-primary py-2 px-3"><Save className="w-4 h-4" /></button>
          </div>
          {jobs.filter((j: any) => j.systemId === sys.id).length > 0 && (
            <>
              <button onClick={() => setShowJobs(v => !v)} className="w-full flex items-center justify-between text-xs text-ink-muted py-1 hover:text-ink transition-colors">
                <span>Saved jobs ({jobs.filter((j: any) => j.systemId === sys.id).length})</span>
                {showJobs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showJobs && (
                <div className="space-y-1.5 mt-2 max-h-48 overflow-y-auto">
                  {jobs.filter((j: any) => j.systemId === sys.id).map((job: any) => (
                    <div key={job.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg hover:bg-surface-100">
                      <span className="flex-1 text-ink font-medium truncate">{job.name}</span>
                      <span className="text-ink-faint text-[10px] flex-shrink-0">{formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })}</span>
                      <button onClick={() => handleLoadJob(job)} className="text-primary font-semibold hover:underline text-[10px] flex-shrink-0">Load</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        </CalcStep>

        <CalcStep n={2}>
          <button onClick={onRunCalc} className="btn-primary w-full justify-center py-3.5 text-base font-semibold shadow-panel">
            <Play className="w-5 h-5" /> Calculate All Runs
          </button>
        </CalcStep>
      </div>

      <div className="flex-1 min-w-0">
        {/* Toolbar: Field Guide + Overview toggle */}
        <div className="flex items-center justify-end gap-2 mb-3">
          <button
            onClick={() => setShowFieldGuide(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border transition-colors ${showFieldGuide ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white border-surface-200 text-ink-muted hover:text-ink hover:bg-surface-50'}`}
            style={{ borderRadius: 'var(--radius)' }}>
            <BookOpen className="w-3.5 h-3.5" />
            Field Guide
          </button>
          <button
            onClick={() => setShowOverview(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border transition-colors ${showOverview ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white border-surface-200 text-ink-muted hover:text-ink hover:bg-surface-50'}`}
            style={{ borderRadius: 'var(--radius)' }}>
            {showOverview ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            System Overview
          </button>
        </div>

        {showFieldGuide && <div className="mb-4"><CalcFieldGuide onClose={() => setShowFieldGuide(false)} /></div>}

        {/* Inline collapsible overview */}
        {showOverview && (
          <div className="mb-4">
            <SystemOverviewPanel sys={sys} />
          </div>
        )}

        {!calc.multiResults ? (
          <div className="card p-16 text-center space-y-6">
            <div className="text-5xl">🧮</div>
            <div>
              <h3 className="font-display font-bold text-lg text-ink mb-1">Ready to calculate</h3>
              <p className="text-sm text-ink-muted">Follow the steps on the left, then click Calculate All Runs.</p>
            </div>
            {/* Mini step guide */}
            <div className="flex flex-col gap-2 text-left max-w-xs mx-auto">
              {CALC_STEPS.slice(0, 3).map(s => (
                <div key={s.n} className="flex items-center gap-3 text-xs">
                  <div className="w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center flex-shrink-0"
                    style={{ background: s.color }}>{s.n}</div>
                  <span className="font-semibold" style={{ color: s.color }}>{s.label}</span>
                  <span className="text-ink-faint">— {s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Results section label */}
            <div className="flex items-center gap-2 px-1">
              <div className="w-5 h-5 flex items-center justify-center text-[10px] font-semibold text-ink-muted bg-surface-100 border border-surface-200 flex-shrink-0"
                style={{ borderRadius: 'var(--radius)' }}>3</div>
              <span className="text-xs font-semibold text-ink">Results</span>
              <span className="text-xs text-ink-faint">— Calculated material quantities and costs</span>
              <div className="flex-1 h-px bg-surface-200" />
            </div>
            {driftedMats.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-4 flex gap-3" style={{ borderRadius: 'var(--radius-card)' }}>
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Materials changed since last calculation</p>
                  <ul className="mt-1 text-xs text-amber-700 space-y-0.5">{driftedMats.map(m => <li key={m.id}>• {m.name}</li>)}</ul>
                  <p className="text-xs text-amber-600 mt-1 italic">Recalculate to get current quantities.</p>
                </div>
              </div>
            )}
            {(() => {
              const bomMats = combinedWithBrackets.filter((m: any) => !m.allBlocked)
              // Look up unitPrice from live sys.materials (not engine results) so price changes show immediately
              const priceMap = Object.fromEntries(sys.materials.map(m => [m.id, m.unitPrice ?? null]))
              const grandCost = bomMats.reduce((a: number, m: any) => {
                const p = priceMap[m.id]; return a + (p != null ? p * m.grandTotal : 0)
              }, 0)
              return (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface-100 border-b border-surface-200 text-ink-muted">
                          <th className="px-2 py-2 text-center font-semibold w-7">#</th>
                          <th className="px-1 py-2 w-9" />
                          <th className="text-left px-3 py-2 font-semibold text-ink">Material</th>
                          <th className="px-3 py-2 font-semibold text-left w-20">Code</th>
                          <th className="px-2 py-2 font-semibold text-center w-12">Unit</th>
                          {calc.runs.map(r => (
                            <th key={r.id} className="px-2 py-2 text-center font-semibold text-primary w-16">
                              {r.name}
                              {r.qty > 1 && <div className="text-[9px] text-ink-faint font-normal">×{r.qty}</div>}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center font-black text-white bg-primary w-16">TOTAL</th>
                          <th className="px-2 py-2 text-right font-semibold w-20">Unit $</th>
                          <th className="px-2 py-2 text-right font-semibold text-emerald-700 w-20">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bomMats.map((mat: any, mi: number) => {
                          const unitPrice = priceMap[mat.id]
                          const lineTotal = unitPrice != null ? unitPrice * mat.grandTotal : null
                          return (
                            <tr key={mat.id} className={mi % 2 === 0 ? 'bg-white' : 'bg-surface-50'}>
                              <td className="px-2 py-2 text-center font-mono font-semibold text-ink-faint">{mi + 1}</td>
                              <td className="px-1 py-1.5 text-center">
                                {mat.photo
                                  ? <img src={mat.photo} alt="" className="w-7 h-7 rounded object-cover mx-auto border border-surface-200" />
                                  : <div className="w-7 h-7 rounded bg-surface-100 border border-surface-200 mx-auto flex items-center justify-center text-[10px] text-ink-faint font-semibold select-none">
                                      {(mat.name ?? '?').charAt(0).toUpperCase()}
                                    </div>
                                }
                              </td>
                              <td className="px-3 py-2 text-ink font-medium leading-snug">
                                {mat.name}
                                {mat._isPlateAuto && mat._sheetResult && <div className="text-[9px] text-primary font-semibold">{mat._sheetResult.partsPerSheet}/sheet · {mat._sheetResult.utilisation}% util</div>}
                                {mat._bracketSource && <div className="text-[9px] text-violet-600 font-semibold">🔩 {mat._bracketSource}{mat._bracketQty ? ` · ${mat._bracketQty}` : ''}</div>}
                              </td>
                              <td className="px-3 py-2 font-mono text-ink-muted">{mat.productCode || '—'}</td>
                              <td className="px-2 py-2 text-center text-ink-muted">{mat.unit}</td>
                              {(mat.perRun ?? []).map((pr: any, ri: number) => (
                                <td key={ri} className="px-2 py-2 text-center">
                                  {pr.totalQty > 0
                                    ? <div><div className="font-mono font-semibold text-primary">{pr.totalQty}</div>{pr.runQty > 1 && <div className="text-[9px] text-ink-faint">({pr.unitQty}×{pr.runQty})</div>}</div>
                                    : <span className="text-surface-300">—</span>}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-center font-black text-base text-primary bg-primary/5 border-l-2 border-primary/20">{mat.grandTotal || '—'}</td>
                              <td className="px-2 py-2 text-right font-mono text-ink-muted whitespace-nowrap">{unitPrice != null ? `$${unitPrice.toFixed(2)}` : <span className="text-surface-300">—</span>}</td>
                              <td className="px-2 py-2 text-right font-semibold text-emerald-700 whitespace-nowrap">{lineTotal != null ? `$${lineTotal.toFixed(2)}` : <span className="text-surface-300">—</span>}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-primary/20 bg-primary/5">
                          <td className="px-3 py-2.5 font-semibold text-ink" colSpan={5}>Subtotal</td>
                          {calc.runs.map((_: any, ri: number) => {
                            const total = bomMats.reduce((a: number, m: any) => a + (m.perRun?.[ri]?.totalQty ?? 0), 0)
                            return <td key={ri} className="px-2 py-2.5 text-center font-semibold text-primary font-mono">{total}</td>
                          })}
                          <td className="px-3 py-2.5 text-center font-black text-lg text-primary bg-primary/10">
                            {bomMats.reduce((a: number, m: any) => a + m.grandTotal, 0)}
                          </td>
                          <td />
                          <td className="px-2 py-2.5 text-right font-black text-emerald-700">
                            {grandCost > 0 ? `$${grandCost.toFixed(2)}` : <span className="text-surface-300 font-normal">—</span>}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )
            })()}
            {/* Rate summary bar */}
            {totalRunLength > 0 && (() => {
              const bomMats      = combinedWithBrackets.filter((m: any) => !m.allBlocked)
              const priceMap2    = Object.fromEntries(sys.materials.map(m => [m.id, m.unitPrice ?? null]))
              const totalMatCost = bomMats.reduce((a: number, m: any) => { const p = priceMap2[m.id]; return a + (p != null ? p * m.grandTotal : 0) }, 0)
              const pills: { label: string; value: string; color: string }[] = [
                { label: 'Total length', value: `${totalRunLength.toFixed(1)} m`, color: '#7c3aed' },
              ]
              if (totalMatCost > 0) {
                pills.push({ label: 'Material rate', value: `$${(totalMatCost / totalRunLength).toFixed(2)}/m`, color: '#059669' })
              }
              if (workSchedule && workSchedule.totalElapsedHours > 0) {
                pills.push({ label: 'Labour rate', value: `${(workSchedule.totalElapsedHours / totalRunLength).toFixed(2)} hr/m`, color: '#0284c7' })
              }
              if (pills.length <= 1) return null
              return (
                <div className="flex flex-wrap gap-2 px-1">
                  {pills.map(p => (
                    <div key={p.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold"
                      style={{ background: p.color + '10', borderColor: p.color + '30', color: p.color }}>
                      <span className="text-[10px] opacity-70">{p.label}</span>
                      <span>{p.value}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
            {combinedWithBrackets.some((m: any) => m.allBlocked) && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 bg-surface-100 border-b border-surface-200 text-xs font-semibold text-ink-muted">Gated Materials</div>
                <div className="p-4 flex flex-wrap gap-2">
                  {combinedWithBrackets.filter((m: any) => m.allBlocked).map((mat: any) => (
                    <span key={mat.id} className="badge bg-surface-100 text-ink-muted">{mat.name}</span>
                  ))}
                </div>
              </div>
            )}
            {workSchedule && (
              <WorkScheduleSection
                schedule={workSchedule}
                showCost={limits.pricing ?? false}
                currency="S$"
              />
            )}

            {/* Overall cost summary */}
            {(() => {
              const bomMats    = combinedWithBrackets.filter((m: any) => !m.allBlocked)
              const priceMap3  = Object.fromEntries(sys.materials.map(m => [m.id, m.unitPrice ?? null]))
              const matTotal   = bomMats.reduce((a: number, m: any) => { const p = priceMap3[m.id]; return a + (p != null ? p * m.grandTotal : 0) }, 0)
              const labourTotal = workSchedule?.totalLabourCost ?? 0
              const thirdTotal  = workSchedule?.totalThirdPartyCost ?? 0
              const grandTotal  = matTotal + labourTotal + thirdTotal
              if (grandTotal === 0) return null
              return (
                <div className="card overflow-hidden border-2 border-emerald-200">
                  <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2">
                    <span className="text-base">💰</span>
                    <span className="font-semibold text-sm text-emerald-800">Overall Total</span>
                  </div>
                  <div className="px-4 py-3 flex flex-wrap gap-4 items-end">
                    {matTotal > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint mb-0.5">Materials</div>
                        <div className="font-mono font-semibold text-emerald-700 text-lg">${matTotal.toFixed(2)}</div>
                      </div>
                    )}
                    {labourTotal > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint mb-0.5">Labour</div>
                        <div className="font-mono font-semibold text-emerald-700 text-lg">${labourTotal.toFixed(2)}</div>
                      </div>
                    )}
                    {thirdTotal > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint mb-0.5">Third Party</div>
                        <div className="font-mono font-semibold text-emerald-700 text-lg">${thirdTotal.toFixed(2)}</div>
                      </div>
                    )}
                    <div className="flex-1" />
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 mb-0.5">Grand Total</div>
                      <div className="font-mono font-black text-emerald-800 text-2xl">${grandTotal.toFixed(2)}</div>
                      {totalRunLength > 0 && <div className="text-[10px] text-emerald-600 font-semibold">${(grandTotal / totalRunLength).toFixed(2)}/m</div>}
                    </div>
                  </div>
                </div>
              )
            })()}

            <button
              onClick={() => setShowBreakdown(v => !v)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-ink-muted hover:text-ink border border-surface-200 bg-white hover:bg-surface-50 transition-all" style={{ borderRadius: 'var(--radius-card)' }}>
              <TableProperties className="w-3.5 h-3.5" />
              {showBreakdown ? 'Hide' : 'Show'} Calculation Breakdown
              {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showBreakdown && (
              <CalcBreakdownPanel
                sys={sys} runs={calc.runs} multiResults={{ ...calc.multiResults, combined: combinedWithBrackets }}
                workSchedule={workSchedule}
              />
            )}

            <p className="text-xs text-ink-faint text-center pb-4">⚠ Quantities rounded up to nearest whole unit per run. Verify site conditions before ordering.</p>
          </div>
        )}
      </div>

    </div>
  )
}
