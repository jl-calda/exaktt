// Formula display helpers — used by CalculatorTab UI and print builder

import type { MtoSystem, RuleRow } from '@/types'

export interface FormulaDef { leftTags: string[]; core: string; rightTags: string[] }

export function getFormulaDef(activeRow: RuleRow | null | undefined, dims: Record<string, number>, sys: MtoSystem): FormulaDef {
  if (!activeRow) return { leftTags: [], core: '—', rightTags: [] }
  const fmt  = (n: number) => parseFloat(n.toFixed(3)).toString()
  const qty_ = parseFloat(String(activeRow.ruleQty))    || 0
  const div  = parseFloat(String(activeRow.ruleDivisor)) || 1
  const key  = activeRow.ruleDimKey ?? ''
  const L    = dims.length ?? 0
  const W    = dims.width  ?? 0
  const dimV = key === '__area' ? L * W : (dims[key] ?? 0)
  const cd   = (sys.customDims ?? []).find(c => c.key === key)
  const dimLabel = key === '__area' ? 'area' : key ? (cd?.name ?? key) : ''
  const dimUnit  = key === '__area' ? 'm²' : key ? (cd?.unit  ?? '') : ''
  const waste = parseFloat(String(activeRow.waste)) || 0

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
    case 'linear_metre':
      leftTags = ['length']
      core = `${fmt(L)}m × ${qty_}`
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
    case 'sheet_size': {
      const tw = activeRow.ruleTileW || 600
      const th = activeRow.ruleTileH || 600
      leftTags = ['area']
      core = `${fmt(L)} × ${fmt(W)} ÷ (${tw} × ${th})`
      rightTags = [`${tw}×${th}mm`]
      break
    }
    default:
      core = activeRow.ruleType ?? ''
  }

  if (waste > 0) rightTags = [...rightTags, `+${waste}% waste`]
  return { leftTags, core, rightTags }
}

export function formulaTextForPrint(activeRow: RuleRow | null | undefined, dims: Record<string, number>, sys: MtoSystem): string {
  const { leftTags, core, rightTags } = getFormulaDef(activeRow, dims, sys)
  const parts = [...leftTags.map(t => `[${t}]`), core, ...rightTags.map(t => `[${t}]`)]
  return parts.join(' ')
}

export function getVariantLeafLabel(sys: MtoSystem, variantId: string, leafKey: string): string {
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
