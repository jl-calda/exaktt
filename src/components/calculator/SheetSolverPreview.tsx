// src/components/calculator/SheetSolverPreview.tsx
'use client'
import { solveSheetCut } from '@/lib/engine/solver'
import type { CustomDim, Material } from '@/types'

interface Props {
  cd:           CustomDim
  partsNeeded:  number
  sysMats?:     Material[]
}

export default function SheetSolverPreview({ cd, partsNeeded, sysMats }: Props) {
  if (!partsNeeded || partsNeeded <= 0) return null

  let sheetW = (cd as any).sheetW ?? 2400
  let sheetH = (cd as any).sheetH ?? 1200
  let plateInfo: { name: string; thk: number; grade: string; matType: string } | null = null

  if (cd.plateMaterialId && sysMats) {
    const pm = sysMats.find(m => m.id === cd.plateMaterialId)
    if (pm?.properties?.width_mm && pm?.properties?.length_mm) {
      sheetW = parseFloat(pm.properties.width_mm as any) || sheetW
      sheetH = parseFloat(pm.properties.length_mm as any) || sheetH
      plateInfo = {
        name:    pm.name,
        thk:     parseFloat(pm.properties.thk_mm as any) || 0,
        grade:   pm.properties.grade as string ?? '',
        matType: pm.properties.material_type as string ?? '',
      }
    }
  }

  const res = solveSheetCut({
    sheetW, sheetH,
    partW: cd.partW ?? 600, partH: cd.partH ?? 400,
    kerf: cd.kerf ?? 0,
    partsNeeded, allowRotation: cd.sheetAllowRotation !== false,
  })

  if (!res || res.sheetsNeeded === 0) return null

  const SCALE  = Math.min(240 / sheetW, 140 / sheetH)
  const sw     = sheetW * SCALE
  const sh     = sheetH * SCALE
  const pw     = res.effectivePartW * SCALE
  const ph     = res.effectivePartH * SCALE
  const kfS    = res.kerf * SCALE

  return (
    <div className="bg-surface-100 border border-surface-300 rounded-xl p-4 mt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-bold text-ink">✂️ {cd.name} — Layout</div>
          {plateInfo && (
            <div className="text-[10px] text-primary font-semibold mt-0.5">
              {plateInfo.name}
              {plateInfo.thk ? ` · t${plateInfo.thk}mm` : ''}
              {plateInfo.grade ? ` · ${plateInfo.grade}` : ''}
              {plateInfo.matType ? ` · ${plateInfo.matType}` : ''}
            </div>
          )}
        </div>
        {res.rotated && (
          <span className="badge bg-amber-50 text-amber-700 text-[10px]">↻ Rotated</span>
        )}
      </div>

      {/* SVG layout */}
      <svg width={sw} height={sh} className="block mx-auto mb-3 border border-surface-300 rounded bg-white overflow-hidden">
        {/* Sheet background */}
        <rect x={0} y={0} width={sw} height={sh} fill="#f1f5f9" />
        {/* Parts grid */}
        {Array.from({ length: res.cols }).map((_, c) =>
          Array.from({ length: res.rows }).map((_, r) => (
            <rect key={`${c}-${r}`}
              x={c * (pw + kfS)} y={r * (ph + kfS)}
              width={pw} height={ph}
              fill="#7c3aed22" stroke="#7c3aed" strokeWidth={0.7} />
          ))
        )}
        {/* Kerf lines */}
        {res.kerf > 0 && Array.from({ length: res.cols - 1 }).map((_, c) => (
          <rect key={`kv${c}`}
            x={(c + 1) * (pw + kfS) - kfS} y={0}
            width={kfS} height={sh}
            fill="#ef444440" />
        ))}
        {res.kerf > 0 && Array.from({ length: res.rows - 1 }).map((_, r) => (
          <rect key={`kh${r}`}
            x={0} y={(r + 1) * (ph + kfS) - kfS}
            width={sw} height={kfS}
            fill="#ef444440" />
        ))}
        {/* Waste overlays */}
        {res.cols * pw < sw - 1 && (
          <rect x={res.cols * (pw + kfS)} y={0}
            width={sw - res.cols * (pw + kfS)} height={sh}
            fill="#94a3b818" stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="4,3" />
        )}
        {res.rows * ph < sh - 1 && (
          <rect x={0} y={res.rows * (ph + kfS)}
            width={sw} height={sh - res.rows * (ph + kfS)}
            fill="#94a3b818" stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="4,3" />
        )}
      </svg>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="font-bold text-primary">{res.partsPerSheet} parts/sheet</span>
        <span className="font-bold text-blue-600">{res.sheetsNeeded} sheet{res.sheetsNeeded !== 1 ? 's' : ''}</span>
        <span className={`font-bold ${res.waste_pct > 30 ? 'text-red-600' : 'text-emerald-600'}`}>
          {res.utilisation}% util · {res.waste_pct}% waste
        </span>
        <span className="text-ink-faint">{sheetW}×{sheetH}mm</span>
      </div>
    </div>
  )
}
