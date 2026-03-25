// src/lib/engine/work.ts
// Engine functions for work activities, bracket BOMs, and cut lists

import type {
  WorkActivity, WorkBracket, SetupBracket, WorkScheduleResult, WorkScheduleSummary,
  MultiRunMaterial, CutListResult, CutListBar, CutItem, OffcutItem,
  BracketBOMItem, Material, MtoSystem, RuleRow,
} from '@/types'
import { computeResults } from './compute'
import { getUnitFactor } from './constants'

// ─── Safe formula evaluator ───────────────────────────────────────────────────
// Supports: numbers, +, -, *, /, (, ), and parameter names
// No eval() — uses recursive descent parsing

interface TokenNum   { type: 'num'; value: number }
interface TokenOp    { type: 'op'; value: string }
interface TokenParen { type: 'paren'; value: string }
interface TokenName  { type: 'name'; value: string }
type Token = TokenNum | TokenOp | TokenParen | TokenName

function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < expr.length) {
    const ch = expr[i]
    if (/\s/.test(ch)) { i++; continue }
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(expr[i + 1] ?? ''))) {
      let num = ''
      while (i < expr.length && /[\d.]/.test(expr[i])) num += expr[i++]
      tokens.push({ type: 'num', value: parseFloat(num) })
    } else if (/[a-zA-Z_]/.test(ch)) {
      let name = ''
      while (i < expr.length && /[\w]/.test(expr[i])) name += expr[i++]
      tokens.push({ type: 'name', value: name })
    } else if (['+', '-', '*', '/'].includes(ch)) {
      tokens.push({ type: 'op', value: ch }); i++
    } else if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch }); i++
    } else {
      i++ // skip unknown chars
    }
  }
  return tokens
}

function parseExpr(tokens: Token[], pos: number, params: Record<string, number>): [number, number] {
  let [left, p] = parseTerm(tokens, pos, params)
  while (p < tokens.length) {
    const tok = tokens[p]
    if (tok.type === 'op' && (tok.value === '+' || tok.value === '-')) {
      const [right, p2] = parseTerm(tokens, p + 1, params)
      left = tok.value === '+' ? left + right : left - right
      p = p2
    } else {
      break
    }
  }
  return [left, p]
}

function parseTerm(tokens: Token[], pos: number, params: Record<string, number>): [number, number] {
  let [left, p] = parseFactor(tokens, pos, params)
  while (p < tokens.length) {
    const tok = tokens[p]
    if (tok.type === 'op' && (tok.value === '*' || tok.value === '/')) {
      const [right, p2] = parseFactor(tokens, p + 1, params)
      left = tok.value === '*' ? left * right : right !== 0 ? left / right : 0
      p = p2
    } else {
      break
    }
  }
  return [left, p]
}

function parseFactor(tokens: Token[], pos: number, params: Record<string, number>): [number, number] {
  if (pos >= tokens.length) return [0, pos]
  const tok = tokens[pos]
  if (tok.type === 'num') return [tok.value, pos + 1]
  if (tok.type === 'name') return [params[tok.value] ?? 0, pos + 1]
  if (tok.type === 'paren' && tok.value === '(') {
    const [val, p2] = parseExpr(tokens, pos + 1, params)
    // consume closing paren
    const p3 = (p2 < tokens.length && tokens[p2].type === 'paren' && tokens[p2].value === ')') ? p2 + 1 : p2
    return [val, p3]
  }
  if (tok.type === 'op' && tok.value === '-') {
    const [val, p2] = parseFactor(tokens, pos + 1, params)
    return [-val, p2]
  }
  return [0, pos + 1]
}

export function evaluateFormula(formula: string, params: Record<string, number> = {}): number {
  try {
    const trimmed = formula.trim()
    if (!trimmed) return 0
    const tokens = tokenize(trimmed)
    if (tokens.length === 0) return 0
    const [result] = parseExpr(tokens, 0, params)
    return isFinite(result) ? result : 0
  } catch {
    return 0
  }
}

// ─── computeBracketQtys ───────────────────────────────────────────────────────

export function computeBracketQtys(
  setupBrackets: SetupBracket[],
  templates:     WorkBracket[],
  dimValues:     Record<string, number>,
  sys?:          MtoSystem,
  criteriaState: Record<string, boolean> = {},
  variantState:  Record<string, string>  = {},
): Record<string, number> {
  const templateMap = new Map(templates.map(t => [t.id, t]))
  const result: Record<string, number> = {}
  for (const sb of setupBrackets) {
    const tmpl = templateMap.get(sb.bracketId)
    if (!tmpl || !sb.ruleSet?.length || !sys) { result[sb.bracketId] = 0; continue }
    const syntheticMat: any = {
      id: sb.bracketId, name: tmpl.name, unit: 'bracket',
      ruleSet:      sb.ruleSet,
      criteriaKeys: sb.criteriaKeys ?? [],
      variantTags:  sb.variantTags  ?? {},
      notes: '', photo: null, productCode: '', category: '',
      properties: {}, tags: [], substrate: 'all', libraryRef: null,
      _libSyncedAt: null, _systemSpecific: false, _createdInSystem: null,
      _createdAt: null, _updatedAt: null, _wasLibrary: null, _madeUniqueAt: null,
    }
    const { materials: results } = computeResults({
      sys:          { ...sys, materials: [syntheticMat] },
      jobDims:      dimValues,
      criteriaState,
      variantState,
    })
    result[sb.bracketId] = results[0]?.qty ?? 0
  }
  return result
}

// ─── computeWorkSchedule ──────────────────────────────────────────────────────

export function computeWorkSchedule(
  activities:      WorkActivity[],
  materials:       MultiRunMaterial[],
  dimValues:       Record<string, number>,
  criteriaState:   Record<string, boolean>,
  runCount:        number,
  showCost:        boolean,
  brackets:        WorkBracket[] = [],
  bracketQtys:     Record<string, number> = {},
  dimOverrides?:   Record<string, { label?: string; unit?: string }>,
  setupBrackets:   SetupBracket[] = [],
  sysMaterials:    Material[] = [],
): WorkScheduleSummary {
  // Roll up bracket fab activities as auto-generated fabrication results
  const setupMap = new Map(setupBrackets.map(sb => [sb.bracketId, sb]))
  const bracketFabResults: WorkScheduleResult[] = []
  for (const bracket of brackets) {
    const bQty = bracketQtys[bracket.id] ?? 0
    if (bQty <= 0) continue
    const sb = setupMap.get(bracket.id)
    const overrides = Object.fromEntries((sb?.params ?? []).map(p => [p.key, p.value]))
    const params = resolveBracketParams(bracket, overrides, sysMaterials)
    for (const ref of bracket.workActivityRefs ?? []) {
      const timePerBracket = evaluateFormula(ref.timeFormula, params)
      const totalMinutes   = timePerBracket * bQty
      const timeUnit       = ref.timeUnit ?? 'min'
      const totalMins      = timeUnit === 'hr' ? totalMinutes * 60 : totalMinutes
      const crewSize       = ref.crewSize ?? 1
      const elapsedHours   = (totalMins / 60) / crewSize

      let labourCost: number | undefined
      if (showCost) {
        if (ref._rateUnitType === 'per_piece' && ref._unitCost != null)
          labourCost = bQty * ref._unitCost
        else if (ref._rateUnitType === 'per_hour' && ref._labourRateHr != null)
          labourCost = (totalMins / 60) * ref._labourRateHr
        else if (ref._rateUnitType === 'lump_sum' && ref._unitCost != null)
          labourCost = ref._unitCost
        else if (ref._rateUnitType === 'per_dim' && ref._unitCost != null)
          labourCost = bQty * ref._unitCost
        else if (ref._labourRateHr)
          labourCost = (totalMins / 60) * ref._labourRateHr
      }

      bracketFabResults.push({
        activityId:    `${bracket.id}_${ref.id}`,
        phase:         'fabrication',
        activityName:  `${bracket.icon ?? '🔩'} ${bracket.name} — ${ref._categoryName ?? 'Activity'}`,
        sourceQty:     bQty,
        sourceUnit:    'bracket',
        timePerUnit:   timePerBracket,
        totalMinutes:  totalMins,
        totalHours:    totalMins / 60,
        crewSize,
        elapsedHours,
        categoryName:  ref._categoryName,
        labourCost,
        isThirdParty:  false,
      })
    }
  }

  const results: WorkScheduleResult[] = []

  for (const act of activities) {
    // Criteria gate
    if (act.criteriaKeys?.length > 0) {
      const passing = act.criteriaKeys.every(k => criteriaState[k] === true)
      if (!passing) continue
    }

    const isThirdParty = act.rateType?.startsWith('third_party') ?? false

    // Resolve source quantity
    let sourceQty  = 0
    let sourceUnit = 'unit'

    switch (act.rateType) {
      case 'per_material_qty': {
        const mat = act.sourceMaterialId ? materials.find(m => m.id === act.sourceMaterialId) : null
        if (!mat) continue
        sourceQty  = mat.grandTotal
        sourceUnit = mat.unit
        break
      }
      case 'per_bracket_qty': {
        if (!act.sourceBracketId) continue
        sourceQty  = bracketQtys[act.sourceBracketId] ?? 0
        const srcBracket = brackets.find(b => b.id === act.sourceBracketId)
        sourceUnit = srcBracket ? srcBracket.name : 'bracket'
        break
      }
      case 'per_dim': {
        if (!act.sourceDimKey) continue
        sourceQty  = dimValues[act.sourceDimKey] ?? 0
        sourceUnit = act.sourceDimKey
        break
      }
      case 'per_run': {
        sourceQty  = runCount
        sourceUnit = 'run'
        break
      }
      case 'per_job': {
        sourceQty  = 1
        sourceUnit = 'job'
        break
      }
      case 'third_party_unit': {
        const mat = act.sourceMaterialId ? materials.find(m => m.id === act.sourceMaterialId) : null
        sourceQty  = mat ? mat.grandTotal : 1
        sourceUnit = mat ? mat.unit : 'unit'
        break
      }
      case 'third_party_day':
      case 'third_party_lump': {
        sourceQty  = 1
        sourceUnit = act.rateType === 'third_party_day' ? 'day' : 'lump'
        break
      }
    }

    // Compute time
    let timePerUnit   = 0
    let totalMinutes  = 0
    let thirdPartyCost: number | undefined

    if (isThirdParty) {
      thirdPartyCost = (act.thirdPartyRate ?? 0) * sourceQty
    } else {
      if (act.speedMode === 'rate' && act.ratePerHr && act.ratePerHr > 0) {
        timePerUnit = 60 / act.ratePerHr
      } else {
        timePerUnit = act.timePerUnit ?? 0
      }
      // For per_dim rates on dims with unit overrides, convert rate to meters
      // (sourceQty is already normalized to meters, but rate is in user's unit)
      if (act.rateType === 'per_dim' && act.sourceDimKey && dimOverrides?.[act.sourceDimKey]?.unit) {
        const factor = getUnitFactor(dimOverrides[act.sourceDimKey].unit!)
        if (factor !== 1) {
          if (act.speedMode === 'rate' && act.ratePerHr && act.ratePerHr > 0) {
            timePerUnit = 60 / (act.ratePerHr * factor)
          } else {
            timePerUnit = (act.timePerUnit ?? 0) / factor
          }
        }
      }
      totalMinutes = timePerUnit * sourceQty
    }

    const totalHours  = totalMinutes / 60
    const crewSize    = Math.max(1, act.crewSize ?? 1)
    const elapsedHours = totalHours / crewSize

    const labourCost = (showCost && act._labourRateHr && !isThirdParty)
      ? totalHours * act._labourRateHr
      : undefined

    results.push({
      activityId:    act.id,
      phase:         act.phase,
      activityName:  act.name,
      sourceQty,
      sourceUnit,
      timePerUnit,
      totalMinutes,
      totalHours,
      crewSize,
      elapsedHours,
      categoryName:  act._categoryName,
      labourCost,
      isThirdParty,
      thirdPartyCost,
    })
  }

  const allResults = [...results, ...bracketFabResults]

  // Group by phase
  const byPhase: Record<string, WorkScheduleResult[]> = {}
  for (const r of allResults) {
    if (!byPhase[r.phase]) byPhase[r.phase] = []
    byPhase[r.phase].push(r)
  }

  const fabResults     = allResults.filter(r => r.phase === 'fabrication')
  const installResults = allResults.filter(r => r.phase === 'installation')

  const totalFabHours       = fabResults.reduce((s, r) => s + r.totalHours, 0)
  const totalInstallHours   = installResults.reduce((s, r) => s + r.totalHours, 0)
  const totalElapsedHours   = allResults.reduce((s, r) => s + r.elapsedHours, 0)
  const totalLabourCost     = showCost ? allResults.reduce((s, r) => s + (r.labourCost ?? 0), 0) : undefined
  const tpc                 = allResults.reduce((s, r) => s + (r.thirdPartyCost ?? 0), 0)
  const totalThirdPartyCost = tpc > 0 ? tpc : undefined

  return { byPhase, totalFabHours, totalInstallHours, totalElapsedHours, totalLabourCost, totalThirdPartyCost }
}

// ─── computeBracketBOM ────────────────────────────────────────────────────────

export interface BracketBOMExpanded {
  bracketId:  string
  bracketQty: number
  materialId: string
  qty:        number
  unit:       string
  notes?:     string
  raw?:       number    // before wastage
  wastePct?:  number    // auto-calc'd waste %
  withWaste?: number    // after wastage, before rounding
}

// ─── Stock wastage helper ────────────────────────────────────────────────────
// For repeated identical cuts from a stock bar, calculate the waste %.
// piecesPerBar = floor(stockLen / cutLen), offcut = stockLen - pieces * cutLen
// wastePct = offcut / (pieces * cutLen) * 100

function calcStockWastePct(cutLengthMm: number, stockLengthMm: number): number {
  if (cutLengthMm <= 0 || stockLengthMm <= 0) return 0
  if (cutLengthMm > stockLengthMm) return 0  // can't fit — no auto-waste
  const piecesPerBar = Math.floor(stockLengthMm / cutLengthMm)
  if (piecesPerBar <= 0) return 0
  const offcut = stockLengthMm - piecesPerBar * cutLengthMm
  return (offcut / (piecesPerBar * cutLengthMm)) * 100
}

// Get stock length in mm from a Material's spec
function getStockLengthMm(mat: Material): number {
  return mat.spec?.stockLengthMm ?? 0
}

// Resolve bracket parameters using SetupBracket params for source/value,
// falling back to BracketParameter defaults for unmapped params
export function resolveBracketParams(
  bracket:       WorkBracket,
  overrides:     Record<string, number> = {},
  materials:     Material[] = [],
  setupParams?:  SetupBracket['params'],
): Record<string, number> {
  const spMap = new Map((setupParams ?? []).map(sp => [sp.key, sp]))
  const resolved: Record<string, number> = {}
  for (const p of bracket.parameters ?? []) {
    const sp = spMap.get(p.key)
    const source          = sp?.source ?? p.source ?? 'input'
    const stockMaterialId = sp?.stockMaterialId ?? p.stockMaterialId
    if (source === 'stock_length' && stockMaterialId) {
      const mat = materials.find(m => m.id === stockMaterialId)
      resolved[p.key] = mat?.spec?.stockLengthMm ?? sp?.value ?? p.default
    } else {
      resolved[p.key] = overrides[p.key] ?? sp?.value ?? p.default
    }
  }
  return resolved
}

export function computeBracketBOM(
  bracket:    WorkBracket,
  qty:        number,
  params:     Record<string, number> = {},
  materials:  Material[] = [],
): BracketBOMExpanded[] {
  // Resolve stock_length params from materials if not already in overrides
  const resolved = resolveBracketParams(bracket, params, materials)

  return bracket.bom.map(item => {
    const unitQty = evaluateFormula(item.qtyFormula, { ...resolved })
    const raw     = unitQty * qty

    // Auto-calculate wastage when material has a stock length and BOM uses a length unit
    let wastePct  = 0
    const isLength = item.qtyUnit === 'mm' || item.qtyUnit === 'm'
    if (isLength && item.materialId) {
      const mat = materials.find(m => m.id === item.materialId)
      if (mat) {
        const stockMm = getStockLengthMm(mat)
        if (stockMm > 0) {
          // cutLength per bracket in mm
          const cutMm = item.qtyUnit === 'm' ? unitQty * 1000 : unitQty
          wastePct = calcStockWastePct(cutMm, stockMm)
        }
      }
    }

    const withWaste = wastePct > 0 ? raw * (1 + wastePct / 100) : raw

    return {
      bracketId:  bracket.id,
      bracketQty: qty,
      materialId: item.materialId,
      qty:        Math.ceil(withWaste),
      unit:       item.qtyUnit,
      notes:      item.notes,
      raw,
      wastePct,
      withWaste,
    }
  })
}

// ─── computeAllBracketBOM ─────────────────────────────────────────────────────

export interface BracketBOMGroup {
  bracketId:   string
  bracketName: string
  bracketIcon: string
  bracketQty:  number
  items: (BracketBOMExpanded & { resolvedName: string; customEntry: boolean })[]
}

export function computeAllBracketBOM(
  brackets:      WorkBracket[],
  bracketQtys:   Record<string, number>,
  sys:           MtoSystem,
  setupBrackets: SetupBracket[] = [],
): BracketBOMGroup[] {
  const setupMap = new Map(setupBrackets.map(sb => [sb.bracketId, sb]))
  const groups: BracketBOMGroup[] = []
  for (const bracket of brackets) {
    const qty = bracketQtys[bracket.id] ?? 0
    if (qty <= 0) continue
    const sb = setupMap.get(bracket.id)
    const overrides = Object.fromEntries((sb?.params ?? []).map(p => [p.key, p.value]))
    const params = resolveBracketParams(bracket, overrides, sys.materials, sb?.params)
    const expanded = computeBracketBOM(bracket, qty, params, sys.materials)
    const items = expanded.map((item, idx) => {
      const sysMat    = item.materialId ? sys.materials.find(m => m.id === item.materialId) : null
      const bomItem   = bracket.bom[idx]
      const resolvedName = sysMat?.name ?? bomItem?.customName ?? item.materialId ?? '(unknown)'
      return { ...item, resolvedName, customEntry: !sysMat && !!bomItem?.customName }
    })
    groups.push({ bracketId: bracket.id, bracketName: bracket.name, bracketIcon: bracket.icon, bracketQty: qty, items })
  }
  return groups
}

// ─── computeCutList (1D bin packing) ─────────────────────────────────────────

const LARGE_OFFCUT_THRESHOLD_MM = 500   // flag offcuts longer than this for reuse

export function computeCutList(
  cuts:         CutItem[],
  stockLengthMm: number,
  stockMaterialId:   string,
  stockMaterialName: string,
): CutListResult {
  if (stockLengthMm <= 0 || cuts.length === 0) {
    return {
      stockMaterialId, stockMaterialName, stockLengthMm,
      barsRequired: 0, cuts, bars: [],
      totalUsedMm: 0, totalWasteMm: 0, wastePct: 0, largeOffcuts: [],
    }
  }

  // Expand cuts into a flat list of individual pieces (sorted longest first for first-fit-decreasing)
  const pieces: { componentName: string; bracketId?: string; materialId: string; lengthMm: number }[] = []
  for (const cut of cuts) {
    for (let i = 0; i < cut.qty; i++) {
      pieces.push({ componentName: cut.componentName, bracketId: cut.bracketId, materialId: cut.materialId, lengthMm: cut.lengthMm })
    }
  }
  pieces.sort((a, b) => b.lengthMm - a.lengthMm)

  // First Fit Decreasing bin packing
  const bars: { remaining: number; cuts: { componentName: string; lengthMm: number }[] }[] = []
  for (const piece of pieces) {
    if (piece.lengthMm > stockLengthMm) continue  // can't fit — skip (would need oversized stock)
    let placed = false
    for (const bar of bars) {
      if (bar.remaining >= piece.lengthMm) {
        bar.remaining -= piece.lengthMm
        bar.cuts.push({ componentName: piece.componentName, lengthMm: piece.lengthMm })
        placed = true
        break
      }
    }
    if (!placed) {
      bars.push({ remaining: stockLengthMm - piece.lengthMm, cuts: [{ componentName: piece.componentName, lengthMm: piece.lengthMm }] })
    }
  }

  const totalUsedMm  = pieces.reduce((s, p) => s + p.lengthMm, 0)
  const totalWasteMm = bars.reduce((s, b) => s + b.remaining, 0)
  const wastePct     = bars.length > 0 ? Math.round((totalWasteMm / (bars.length * stockLengthMm)) * 1000) / 10 : 0

  const largeOffcuts: OffcutItem[] = bars
    .map((b, i) => ({ barIndex: i, lengthMm: b.remaining, canReuse: b.remaining >= LARGE_OFFCUT_THRESHOLD_MM }))
    .filter(o => o.canReuse)

  const barResults: CutListBar[] = bars.map(b => ({
    cuts:     b.cuts,
    offcutMm: b.remaining,
  }))

  return {
    stockMaterialId,
    stockMaterialName,
    stockLengthMm,
    barsRequired:  bars.length,
    cuts,
    bars:          barResults,
    totalUsedMm,
    totalWasteMm,
    wastePct,
    largeOffcuts,
  }
}
