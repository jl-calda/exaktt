// src/lib/engine/compute.ts
// Full TypeScript port of computeResults from the single-file artifact

import type {
  MtoSystem, Material, CustomDim, CustomCriterion, Variant,
  Run, MaterialResult, RuleRow,
} from '@/types'
import { solveStockLengths, solveSheetCut } from './solver'
import { resolveSegments } from './segments'

// ─── Primitive dimensions ────────────────────────────────────────────────────

export const PRIMITIVE_DIMS = [
  { key: 'length',    label: 'Length',       unit: 'm',       icon: '📏', step: '0.1' },
  { key: 'width',     label: 'Width',        unit: 'm',       icon: '↔️',  step: '0.1' },
  { key: 'height',    label: 'Height',       unit: 'm',       icon: '↕️',  step: '0.1' },
  { key: 'perimeter', label: 'Perimeter',    unit: 'm',       icon: '⬜', step: '0.1' },
  { key: 'corners',   label: 'Corners',      unit: 'corners', icon: '🔲', step: '1'   },
  { key: 'ends',      label: 'Ends',         unit: 'ends',    icon: '🔚', step: '1'   },
  { key: 'workers',   label: 'Workers',      unit: 'workers', icon: '👷', step: '1'   },
  { key: 'levels',    label: 'Levels/Floors',unit: 'levels',  icon: '🏢', step: '1'   },
  { key: 'openings',  label: 'Openings',     unit: 'openings',icon: '🚪', step: '1'   },
  { key: 'custom_a',  label: 'Custom A',     unit: '',        icon: '🔧', step: '1'   },
  { key: 'custom_b',  label: 'Custom B',     unit: '',        icon: '⚙️',  step: '1'   },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasPlateProps(mat: Material): boolean {
  const p = mat.properties ?? {}
  return !!(p.width_mm && p.length_mm)
}

function getPlateDims(mat: Material) {
  const p = mat.properties ?? {}
  return {
    sheetW:  parseFloat(p.width_mm  as any) || 0,
    sheetH:  parseFloat(p.length_mm as any) || 0,
    thk:     parseFloat(p.thk_mm    as any) || 0,
    grade:   p.grade    as string ?? '',
    matType: p.material_type as string ?? '',
  }
}

function migrateMat(mat: any): Material {
  if (mat.ruleSet) return mat
  if (!mat.ruleType) return { ...mat, ruleSet: [], customDimKey: mat.customDimKey ?? null, criteriaKeys: mat.criteriaKeys ?? [], variantTags: mat.variantTags ?? {} }
  const row: RuleRow = {
    id: 'r_' + Math.random().toString(36).slice(2, 7),
    condition:    null,
    ruleType:     mat.ruleType,
    ruleQty:      mat.ruleQty      ?? 1,
    ruleOutUnit:  mat.ruleOutUnit  ?? 'each',
    ruleDivisor:  mat.ruleDivisor  ?? 1,
    ruleDimKey:   mat.ruleDimKey   ?? '',
    ruleTileW:    mat.ruleTileW    ?? 600,
    ruleTileH:    mat.ruleTileH    ?? 600,
    ruleBagSize:  mat.ruleBagSize  ?? 25,
    waste:        mat.waste        ?? 0,
    ruleStockDimKey: '',
    ruleStockLength: 0,
  }
  return { ...mat, ruleSet: [row], criteriaKeys: mat.criteriaKeys ?? [], variantTags: mat.variantTags ?? {} }
}

function matHasRule(mat: Material): boolean {
  return (mat.ruleSet ?? []).some(r => r.ruleType)
}

function getLeafFromPath(nodes: any[], leafKey: string): string[] {
  for (const n of nodes) {
    if (n.key === leafKey) return [n.key]
    if (n.children?.length) {
      const path = getLeafFromPath(n.children, leafKey)
      if (path.length) return [n.key, ...path]
    }
  }
  return []
}

// ─── Main compute ────────────────────────────────────────────────────────────

export interface ComputeOptions {
  sys:            MtoSystem
  jobDims:        Record<string, number | string>
  criteriaState:  Record<string, boolean>
  variantState:   Record<string, string>
  segments?:      any[]
  substrate?:     string
}

export function computeResults(opts: ComputeOptions): MaterialResult[] {
  const { sys, criteriaState, variantState, segments = [], substrate = 'all' } = opts
  const jobDims = { ...opts.jobDims }
  const { materials, customDims = [], customCriteria = [], variants = [] } = sys

  // Resolve segment totals
  if (segments.length > 0) {
    const res = resolveSegments(segments)
    if (!jobDims.length) jobDims.length = res.length
    if (!jobDims.ends)   jobDims.ends   = res.ends
    if (!jobDims.corners) jobDims.corners = res.corners
  }

  // Build prim values
  const prim: Record<string, number> = {}
  PRIMITIVE_DIMS.forEach(d => { prim[d.key] = parseFloat(jobDims[d.key] as any) || 0 })

  // Resolve custom dims
  const customVals: Record<string, number> = {}

  customDims.forEach(cd => {
    switch (cd.derivType) {
      case 'user_input':
        customVals[cd.key] = parseFloat(jobDims[cd.key] as any) || 0
        break
      case 'spacing': {
        const spacingInputKey = '__spacing_' + cd.key
        const userSpacing = cd.spacingMode === 'user'
          ? parseFloat(jobDims[spacingInputKey] as any) || parseFloat(cd.spacing as any) || 1
          : null
        const actualSp = userSpacing ?? parseFloat(cd.spacing as any) ?? 1
        const L = prim[cd.spacingTargetDim ?? 'length'] ?? prim.length
        const firstGapVal = parseFloat(cd.firstGap as any) ?? 300
        let count = 0
        if (L > 0) {
          if (cd.firstSupportMode === 'ground') {
            count = Math.max(0, Math.ceil(L / actualSp) + 1)
          } else if (cd.firstSupportMode === 'offset') {
            const remaining = Math.max(0, L - firstGapVal / 1000)
            count = 1 + (remaining > 0 ? Math.max(0, Math.ceil(remaining / actualSp)) : 0)
          } else {
            count = Math.max(0, Math.ceil(L / actualSp) + (cd.includesEndpoints ? 1 : -1))
          }
        }
        customVals[cd.key] = count
        break
      }
      case 'sum':
        customVals[cd.key] = (cd.sumKeys ?? []).reduce((a, k) => a + (prim[k] ?? customVals[k] ?? 0), 0)
        break
      case 'area':
        customVals[cd.key] = prim.length * prim.width
        break
      case 'formula':
        customVals[cd.key] = (parseFloat(cd.formulaQty as any) || 1) * (prim[cd.formulaDimKey ?? 'length'] ?? 0)
        break
      case 'stock_length': {
        const rawTarget = parseFloat(jobDims[cd.stockTargetDim ?? 'length'] as any) || 0
        const metreDims = new Set(['length', 'height', 'width', 'perimeter'])
        const targetMm = metreDims.has(cd.stockTargetDim ?? 'length') ? rawTarget * 1000 : rawTarget
        const result = solveStockLengths(targetMm, cd.stockLengths ?? [], 'min_waste', {})
        customVals[cd.key] = result.totalQty
        jobDims[cd.key + '_total'] = result.totalQty
        jobDims[cd.key + '_waste'] = result.cutWaste
        jobDims['__solver_' + cd.key] = result as any
        break
      }
      case 'sheet_cut': {
        const partsNeeded = parseFloat(jobDims[cd.sheetPartsNeededDim ?? 'custom_a'] as any) || 0
        let sheetW = (cd as any).sheetW ?? 2400
        let sheetH = (cd as any).sheetH ?? 1200
        if (cd.plateMaterialId) {
          const pm = materials.find(m => m.id === cd.plateMaterialId)
          if (pm && hasPlateProps(pm)) {
            const pd = getPlateDims(pm)
            sheetW = pd.sheetW || sheetW
            sheetH = pd.sheetH || sheetH
          }
        }
        const result = solveSheetCut({ sheetW, sheetH, partW: cd.partW ?? 600, partH: cd.partH ?? 400, kerf: cd.kerf ?? 0, partsNeeded, allowRotation: cd.sheetAllowRotation !== false })
        customVals[cd.key] = result.sheetsNeeded
        jobDims[cd.key + '_sheets']        = result.sheetsNeeded
        jobDims[cd.key + '_pps']           = result.partsPerSheet
        jobDims[cd.key + '_waste_pct']     = result.waste_pct
        jobDims['__sheetresult_' + cd.key] = result as any
        break
      }
    }
  })

  const getDimVal = (key: string): number => {
    if (key in prim) return prim[key]
    if (key in customVals) return customVals[key]
    const jv = jobDims[key]
    if (jv !== undefined) return parseFloat(jv as any) || 0
    return 0
  }

  // Build plate-driven map
  const plateDrivenMats = new Map<string, { dimKey: string; result: any }>()
  for (const cd of customDims) {
    if (cd.derivType !== 'sheet_cut' || !cd.plateMaterialId) continue
    const res = jobDims['__sheetresult_' + cd.key]
    if (res) plateDrivenMats.set(cd.plateMaterialId, { dimKey: cd.key, result: res })
  }

  const plateMaterialIds = new Set(
    customDims.filter(cd => cd.derivType === 'sheet_cut' && cd.plateMaterialId).map(cd => cd.plateMaterialId)
  )

  // Materials used as bracket BOM components get their quantities from bracket
  // expansion only — exclude them from direct rule evaluation to avoid doubling
  const bracketMatIds = new Set(
    (sys.customBrackets ?? []).flatMap((b: any) => (b.bom ?? []).map((item: any) => item.materialId).filter(Boolean))
  )

  const active = materials
    .filter(m => m.substrate === 'all' || substrate === 'all' || m.substrate === substrate)
    .map(migrateMat)
    .filter(m => !bracketMatIds.has(m.id) && (matHasRule(m) || plateMaterialIds.has(m.id)))

  return active.map(mat => {
    // Plate auto-qty
    const plateDriven = plateDrivenMats.get(mat.id)
    if (plateDriven) {
      const sheets = plateDriven.result?.sheetsNeeded ?? 0
      return { ...mat, activeRow: null, raw: sheets, withWaste: sheets, qty: sheets, blocked: false, blockedBy: [], _isPlateAuto: true, _sheetDimKey: plateDriven.dimKey, _sheetResult: plateDriven.result } as MaterialResult
    }

    // Criteria gate
    const failedCriteria = (mat.criteriaKeys ?? []).filter(k => criteriaState[k] === false)
    if (failedCriteria.length > 0) {
      const names = failedCriteria.map(k => customCriteria.find(c => c.key === k)?.name ?? k)
      return { ...mat, raw: 0, withWaste: 0, qty: 0, blocked: true, blockedBy: names, activeRow: null } as MaterialResult
    }

    // Variant gate
    const vBlocked: string[] = []
    Object.entries(mat.variantTags ?? {}).forEach(([vid, leafKey]) => {
      if (!leafKey) return
      const selected = variantState[vid]
      if (!selected) { vBlocked.push(variants.find(v => v.id === vid)?.name ?? vid); return }
      const v = variants.find(v => v.id === vid)
      if (!v) return
      const selPath = getLeafFromPath(v.nodes, selected)
      const matPath = getLeafFromPath(v.nodes, leafKey)
      const match = matPath.every((k, i) => k === selPath[i])
      if (!match) vBlocked.push((v.name ?? vid) + ': ' + leafKey)
    })
    if (vBlocked.length > 0) {
      return { ...mat, raw: 0, withWaste: 0, qty: 0, blocked: true, blockedBy: vBlocked, activeRow: null } as MaterialResult
    }

    // Derived criteria
    for (const cr of (customCriteria ?? [])) {
      if (cr.type !== 'derived') continue
      const dv = getDimVal(cr.dimKey)
      const threshold = parseFloat(cr.threshold as any)
      const tMm = threshold >= 100 ? threshold : threshold * 1000
      const dvMm = dv < 100 ? dv * 1000 : dv
      const passes = cr.operator === '>'  ? dvMm >  tMm :
                     cr.operator === '>=' ? dvMm >= tMm :
                     cr.operator === '<'  ? dvMm <  tMm :
                     cr.operator === '<=' ? dvMm <= tMm : true
      if (!passes && (mat.criteriaKeys ?? []).includes(cr.key)) {
        return { ...mat, raw: 0, withWaste: 0, qty: 0, blocked: false, blockedBy: [], activeRow: null, noMatch: true, noMatchReason: cr.name + ' not met' } as MaterialResult
      }
    }

    // Rule evaluation
    const ruleSet = mat.ruleSet ?? []
    const rowConditionMet = (row: RuleRow): boolean => {
      if (!row.condition) return true
      const { criterionKey, whenValue } = row.condition
      const crState = criteriaState[criterionKey]
      return (crState === true) === whenValue
    }
    const activeRow = ruleSet.find(r => r.ruleType && rowConditionMet(r)) ?? null

    if (!activeRow) {
      return { ...mat, raw: 0, withWaste: 0, qty: 0, blocked: false, blockedBy: [], activeRow: null, noMatch: true, noMatchReason: 'No matching rule row' } as MaterialResult
    }

    // Calculate qty
    let raw = 0
    const qty_  = parseFloat(activeRow.ruleQty as any) || 0
    const div   = parseFloat(activeRow.ruleDivisor as any) || 1
    const dimV  = getDimVal(activeRow.ruleDimKey)

    switch (activeRow.ruleType) {
      case 'ratio':             raw = (qty_ / div) * dimV; break
      case 'ratio_length':      raw = (qty_ / div) * prim.length; break
      case 'ratio_area':        raw = (qty_ / div) * (prim.length * prim.width); break
      case 'linear_metre':      raw = qty_ * prim.length; break
      case 'base_plus_length':  raw = qty_ + prim.length / div; break
      case 'coverage_per_item': raw = (prim.length * prim.width) / div; break
      case 'sheet_size':        raw = (prim.length * prim.width) / ((activeRow.ruleTileW / 1000) * (activeRow.ruleTileH / 1000)); break
      case 'tile_size':         raw = (prim.length * prim.width) / ((activeRow.ruleTileW / 1000) * (activeRow.ruleTileH / 1000)); break
      case 'kg_per_sqm':        raw = qty_ * prim.length * prim.width; break
      case 'kg_per_metre':      raw = qty_ * prim.length; break
      case 'kg_per_item':       raw = qty_ * dimV; break
      case 'bags_from_kg':      raw = (qty_ * prim.length * prim.width) / (activeRow.ruleBagSize || 25); break
      case 'fixed_qty':         raw = qty_; break
      case 'stock_length_qty': {
        const solverResult = jobDims['__solver_' + activeRow.ruleStockDimKey] as any
        const item = solverResult?.items?.find((i: any) => i.length === parseFloat(activeRow.ruleStockLength as any))
        raw = item?.qty ?? 0
        break
      }
    }

    const withWaste = raw * (1 + (activeRow.waste || 0) / 100)
    const qty = Math.ceil(withWaste)

    return { ...mat, raw: parseFloat(raw.toFixed(4)), withWaste: parseFloat(withWaste.toFixed(4)), qty, blocked: false, blockedBy: [], activeRow } as MaterialResult
  })
}

// ─── Multi-run compute ────────────────────────────────────────────────────────

export function computeMultiRun(
  runs: Run[],
  sys: MtoSystem,
  stockOptimMode: 'min_waste' | 'min_sections' = 'min_waste'
) {
  if (!runs || runs.length === 0) return null

  const runResults = runs.map(run => {
    const criteriaState = run.criteriaState ?? {}
    const variantState  = run.variantState  ?? {}
    const jobDims: Record<string, number | string> = { ...(run.job ?? {}) }

    if (sys.inputModel === 'linear_run') {
      if (run.inputMode === 'simple') {
        jobDims.length  = parseFloat(run.simpleJob?.length as any) || 0
        jobDims.corners = parseInt(run.simpleJob?.corners as any) || 0
        jobDims.ends    = criteriaState['loop'] ? 0 : 2
        jobDims['__spacing_int_brackets'] = parseFloat(run.simpleJob?.spacing as any) || 10
      } else if (run.inputMode === 'segment' && run.segments?.length) {
        const res = resolveSegments(run.segments)
        jobDims.length  = res.length
        jobDims.ends    = res.ends
        jobDims.corners = res.corners
      }
    }

    const results = computeResults({ sys, jobDims, criteriaState, variantState, segments: run.inputMode === 'segment' ? run.segments : [] })
    return { runId: run.id, runName: run.name, qty: run.qty || 1, results }
  })

  const allMats = runResults[0]?.results ?? []
  const combined = allMats.map(mat => {
    const perRun = runResults.map(rr => {
      const r = rr.results.find(x => x.id === mat.id) ?? mat
      const unitQty  = r.qty || 0
      const totalQty = unitQty * (rr.qty || 1)
      return { runId: rr.runId, runName: rr.runName, runQty: rr.qty || 1, unitQty, totalQty, blocked: r.blocked || false, blockedBy: r.blockedBy || [], activeRow: r.activeRow || null, raw: r.raw || 0, solverResults: {} }
    })
    return { ...mat, perRun, grandTotal: perRun.reduce((a, r) => a + r.totalQty, 0), allBlocked: perRun.every(r => r.blocked) }
  })

  return { runResults, combined }
}
