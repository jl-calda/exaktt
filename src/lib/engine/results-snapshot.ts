// Build a JobLastResults snapshot from compute results — used when saving jobs

import type { MtoSystem, Run, JobLastResults, WorkScheduleSummary } from '@/types'
import { getRunDims } from './run-dims'
import { formulaTextForPrint } from './formula'

export function buildLastResults(
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
