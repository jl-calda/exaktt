// Resolve which primitive dims a system uses and extract dim values from a Run

import type { MtoSystem, Run } from '@/types'
import { PRIMITIVE_DIMS, DIMS_FOR_INPUT_MODEL } from './constants'

/** Which primitive + user-input dim keys does this system actually use? */
export function getRelevantKeys(sys: MtoSystem): Set<string> {
  const keys = new Set<string>()
  const dimKeys = DIMS_FOR_INPUT_MODEL[sys.inputModel]
  if (dimKeys) {
    for (const k of dimKeys) keys.add(k)
  } else {
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

/** Resolve a single run's dim values into a flat { key: number } map */
export function getRunDims(run: Run, sys: MtoSystem): Record<string, number> {
  const relevant = getRelevantKeys(sys)
  const dims: Record<string, number> = {}
  if (sys.inputModel === 'linear' && run.inputMode === 'simple') {
    dims.length    = parseFloat(run.simpleJob?.length as string) || 0
    dims.corners   = 0
    dims.end1      = 1
    dims.end2      = 1
    dims.both_ends = 2
  }
  for (const [k, v] of Object.entries(run.job ?? {})) {
    if (!relevant.has(k)) continue
    const n = parseFloat(String(v))
    if (!isNaN(n)) dims[k] = n
  }
  return dims
}
