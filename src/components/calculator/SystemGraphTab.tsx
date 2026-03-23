// src/components/calculator/SystemGraphTab.tsx
// Vertical dependency tree with row-wrapping and zoom
'use client'
import { useMemo, useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import type { MtoSystem } from '@/types'
import { PRIMITIVE_DIMS } from '@/lib/engine/constants'

// ── Layout constants ───────────────────────────────────────────────────────────
const NODE_W      = 148
const NODE_H      = 44
const H_GAP       = 6     // gap between nodes in same sub-row
const WRAP_V_GAP  = 8     // gap between wrapped sub-rows within same level
const ROW_GAP     = 54    // vertical gap between levels (for bezier curves)
const LABEL_H     = 16
const PAD_X       = 24
const PAD_Y       = 14
const MAX_PER_ROW = 6     // nodes before wrapping to next sub-row

// ── Colours ────────────────────────────────────────────────────────────────────
const C = {
  system:   { bg: '#1e293b', border: '#475569', text: '#f1f5f9', edge: '#94a3b8' },
  prim:     { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', edge: '#60a5fa' },
  custom:   { bg: '#ede9fe', border: '#c4b5fd', text: '#6d28d9', edge: '#a78bfa' },
  criteria: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', edge: '#fbbf24' },
  variant:  { bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d', edge: '#f472b6' },
  material: { bg: '#ffffff', border: '#e2e8f0', text: '#1e293b', edge: '#94a3b8' },
  bracket:  { bg: '#dcfce7', border: '#86efac', text: '#166534', edge: '#4ade80' },
  activity: { bg: '#f0f9ff', border: '#7dd3fc', text: '#0c4a6e', edge: '#38bdf8' },
} as const
type CK = keyof typeof C

const LEVEL_META = [
  { label: 'Inputs',               color: '#475569' },
  { label: 'Custom Dimensions',    color: '#7c3aed' },
  { label: 'Criteria & Variants',  color: '#d97706' },
  { label: 'Materials',            color: '#64748b' },
  { label: 'Custom Brackets',      color: '#16a34a' },
  { label: 'Work Activities',      color: '#0369a1' },
]

interface NodeBox {
  id:    string
  level: number
  pos:   number
  x:     number
  y:     number
  label: string
  sub?:  string
  icon?: string
  ck:    CK
  photo?: string | null
}
interface Edge { fromId: string; toId: string; ck: CK }

// ── Bezier bottom-centre → top-centre ─────────────────────────────────────────
function curvePath(fx: number, fy: number, tx: number, ty: number) {
  const cy = (fy + ty) / 2
  return `M ${fx} ${fy} C ${fx} ${cy}, ${tx} ${cy}, ${tx} ${ty}`
}

// ── Which primitives are referenced ───────────────────────────────────────────
function usedPrimKeys(sys: MtoSystem) {
  const s  = new Set<string>()
  const ps = new Set<string>(PRIMITIVE_DIMS.map(p => p.key))
  for (const cd of sys.customDims ?? []) {
    if (cd.derivType === 'spacing'      && cd.spacingTargetDim) s.add(cd.spacingTargetDim)
    if (cd.derivType === 'stock_length' && cd.stockTargetDim)   s.add(cd.stockTargetDim)
    if (cd.derivType === 'formula'      && cd.formulaDimKey)    s.add(cd.formulaDimKey)
    if (cd.derivType === 'sum') (cd.sumKeys ?? []).forEach(k => ps.has(k) && s.add(k))
  }
  for (const m of sys.materials ?? [])
    for (const r of m.ruleSet ?? [])
      if (r.ruleDimKey && ps.has(r.ruleDimKey)) s.add(r.ruleDimKey)
  for (const cr of sys.customCriteria ?? [])
    if (cr.type === 'derived' && cr.dimKey && ps.has(cr.dimKey)) s.add(cr.dimKey)
  for (const w of sys.warnings ?? []) if (ps.has(w.dimKey)) s.add(w.dimKey)
  for (const a of sys.workActivities ?? [])
    if (a.rateType === 'per_dim' && a.sourceDimKey && ps.has(a.sourceDimKey)) s.add(a.sourceDimKey)
  if (sys.inputModel === 'linear_run') { s.add('length'); s.add('corners'); s.add('ends') }
  if (sys.inputModel === 'area')       { s.add('length'); s.add('width') }
  return PRIMITIVE_DIMS.filter(p => s.has(p.key)).map(p => p.key)
}

// ── Layout helpers ─────────────────────────────────────────────────────────────
function subRowsForCount(n: number) { return Math.max(1, Math.ceil(n / MAX_PER_ROW)) }
function levelTotalH(n: number) {
  const rows = subRowsForCount(n)
  return LABEL_H + rows * NODE_H + (rows - 1) * WRAP_V_GAP
}

// ── Build graph ────────────────────────────────────────────────────────────────
function buildGraph(sys: MtoSystem) {
  const cds      = sys.customDims      ?? []
  const criteria = sys.customCriteria  ?? []
  const variants = sys.variants        ?? []
  const mats     = sys.materials       ?? []
  const brackets = sys.customBrackets  ?? []
  const acts     = sys.workActivities  ?? []
  const ps       = new Set<string>(PRIMITIVE_DIMS.map(p => p.key))
  const cdKeys   = new Set(cds.map(c => c.key))

  const PER_SYSTEM_ACT = new Set(['per_run', 'per_job', 'third_party_lump', 'third_party_day'])
  const fixedMats  = mats.filter(m => {
    const rs = (m.ruleSet ?? []).filter(r => r.ruleType)
    return rs.length > 0 && rs.every(r => r.ruleType === 'fixed_qty') && rs.some(r => r.ruleQty > 0)
  })
  const systemActs = acts.filter(a => PER_SYSTEM_ACT.has(a.rateType))
  const hasSystem  = fixedMats.length > 0 || systemActs.length > 0

  // ── Raw nodes (pos = index within level) ──────────────────────────────────
  const raw: Omit<NodeBox, 'x' | 'y'>[] = []

  // Level 0
  if (hasSystem) raw.push({ id: 'sys', level: 0, pos: 0, label: sys.name, sub: 'Fixed / per system', icon: sys.icon, ck: 'system' })
  usedPrimKeys(sys).forEach((key, i) => {
    const pd = PRIMITIVE_DIMS.find(p => p.key === key)!
    raw.push({ id: 'prim_' + key, level: 0, pos: hasSystem ? i + 1 : i, label: pd.label, sub: pd.unit ? `(${pd.unit})` : undefined, icon: pd.icon, ck: 'prim' })
  })
  // Level 1
  cds.forEach((cd, i) => raw.push({
    id: 'cd_' + cd.key, level: 1, pos: i, label: cd.name, icon: cd.icon ?? '🔗',
    sub: cd.derivType === 'spacing' ? 'Spacing' : cd.derivType === 'stock_length' ? 'Stock solver' : cd.derivType === 'formula' ? 'Formula' : cd.derivType === 'sum' ? 'Sum' : cd.derivType,
    ck: 'custom',
  }))
  // Level 2
  criteria.forEach((cr, i) => raw.push({ id: 'cr_' + cr.key, level: 2, pos: i, label: cr.name, icon: cr.icon, sub: cr.type === 'input' ? 'Toggle' : 'Auto', ck: 'criteria' }))
  variants.forEach((v, i)  => raw.push({ id: 'var_' + v.id, level: 2, pos: criteria.length + i, label: v.name, icon: v.icon, sub: `${v.nodes.length} options`, ck: 'variant' }))
  // Level 3
  mats.forEach((m, i)      => raw.push({ id: 'mat_' + m.id, level: 3, pos: i, label: m.name, sub: m.productCode || m.unit, ck: 'material', photo: m.photo }))
  // Level 4
  brackets.forEach((b, i)  => raw.push({ id: 'brk_' + b.id, level: 4, pos: i, label: b.name, icon: b.icon, sub: `${b.bom.length} BOM · ${b.parameters.length} params`, ck: 'bracket' }))
  // Level 5
  acts.forEach((a, i)      => raw.push({ id: 'act_' + a.id, level: 5, pos: i, label: a.name, icon: a.icon, sub: a.phase, ck: 'activity' }))

  // ── Count nodes per level ──────────────────────────────────────────────────
  const countByLevel = [0,1,2,3,4,5].map(lv => raw.filter(n => n.level === lv).length)

  // SVG width: widest effective row (capped at MAX_PER_ROW for materials)
  const effectiveCounts = countByLevel.map((n, lv) => lv === 3 ? Math.min(n, MAX_PER_ROW) : n)
  const svgW = Math.max(
    ...effectiveCounts.map(n => n * NODE_W + Math.max(0, n - 1) * H_GAP + 2 * PAD_X),
    400,
  )

  // ── Dynamic level y positions ──────────────────────────────────────────────
  const levelBaseY: number[] = []
  let y = PAD_Y
  for (let lv = 0; lv < 6; lv++) {
    levelBaseY.push(y)
    if (countByLevel[lv] > 0) {
      y += levelTotalH(countByLevel[lv]) + ROW_GAP
    }
  }

  // ── Assign x, y to each node (wrapping) ───────────────────────────────────
  function nodeXY(lv: number, pos: number) {
    const totalInLevel  = countByLevel[lv]
    const subRow        = Math.floor(pos / MAX_PER_ROW)
    const posInSubRow   = pos % MAX_PER_ROW
    const countThisRow  = Math.min(MAX_PER_ROW, totalInLevel - subRow * MAX_PER_ROW)
    const rowW          = countThisRow * NODE_W + Math.max(0, countThisRow - 1) * H_GAP
    const startX        = Math.max(PAD_X, (svgW - rowW) / 2)
    const nx = startX + posInSubRow * (NODE_W + H_GAP)
    const ny = levelBaseY[lv] + LABEL_H + subRow * (NODE_H + WRAP_V_GAP)
    return { x: nx, y: ny }
  }

  const nodes: NodeBox[] = raw.map(n => ({ ...n, ...nodeXY(n.level, n.pos) }))
  const nmap = new Map(nodes.map(n => [n.id, n]))

  // ── Edges ──────────────────────────────────────────────────────────────────
  const seen  = new Set<string>()
  const edges: Edge[] = []
  function edge(from: string, to: string, ck: CK) {
    const k = from + '→' + to
    if (seen.has(k) || !nmap.has(from) || !nmap.has(to)) return
    seen.add(k); edges.push({ fromId: from, toId: to, ck })
  }

  // System → fixed mats & per-system acts
  for (const m of fixedMats)  edge('sys', 'mat_' + m.id, 'system')
  for (const a of systemActs) edge('sys', 'act_' + a.id, 'system')

  // Prim → Custom
  for (const cd of cds) {
    if (cd.derivType === 'spacing'      && cd.spacingTargetDim) edge('prim_' + cd.spacingTargetDim, 'cd_' + cd.key, 'prim')
    if (cd.derivType === 'stock_length' && cd.stockTargetDim)   edge('prim_' + cd.stockTargetDim,   'cd_' + cd.key, 'prim')
    if (cd.derivType === 'formula'      && cd.formulaDimKey)    edge('prim_' + cd.formulaDimKey,    'cd_' + cd.key, 'prim')
    if (cd.derivType === 'sum') for (const k of cd.sumKeys ?? []) edge('prim_' + k, 'cd_' + cd.key, 'prim')
  }
  // Prim/Custom → Criteria
  for (const cr of criteria) {
    if (cr.type === 'derived' && cr.dimKey) {
      const isPrim = ps.has(cr.dimKey)
      edge(isPrim ? 'prim_' + cr.dimKey : 'cd_' + cr.dimKey, 'cr_' + cr.key, isPrim ? 'prim' : 'custom')
    }
  }
  // Prim/Custom → Material
  for (const m of mats) {
    for (const r of m.ruleSet ?? []) {
      if (!r.ruleType || !r.ruleDimKey) continue
      if (ps.has(r.ruleDimKey))     edge('prim_' + r.ruleDimKey, 'mat_' + m.id, 'prim')
      if (cdKeys.has(r.ruleDimKey)) edge('cd_' + r.ruleDimKey,   'mat_' + m.id, 'custom')
    }
    if (m.customDimKey && cdKeys.has(m.customDimKey)) edge('cd_' + m.customDimKey, 'mat_' + m.id, 'custom')
  }
  // Criteria/Variant → Material
  for (const m of mats) {
    for (const ck of m.criteriaKeys ?? [])              edge('cr_' + ck,   'mat_' + m.id, 'criteria')
    for (const vid of Object.keys(m.variantTags ?? {})) edge('var_' + vid, 'mat_' + m.id, 'variant')
  }
  // Material → Bracket (BOM)
  for (const b of brackets)
    for (const item of b.bom ?? [])
      if (item.materialId) edge('mat_' + item.materialId, 'brk_' + b.id, 'material')
  // → Work Activity
  for (const a of acts) {
    if (a.rateType === 'per_material_qty' && a.sourceMaterialId) edge('mat_' + a.sourceMaterialId, 'act_' + a.id, 'material')
    if (a.rateType === 'per_bracket_qty'  && a.sourceBracketId)  edge('brk_' + a.sourceBracketId,  'act_' + a.id, 'bracket')
    if (a.rateType === 'per_dim' && a.sourceDimKey) {
      const isPrim = ps.has(a.sourceDimKey)
      edge(isPrim ? 'prim_' + a.sourceDimKey : 'cd_' + a.sourceDimKey, 'act_' + a.id, isPrim ? 'prim' : 'custom')
    }
    for (const ck of a.criteriaKeys ?? []) edge('cr_' + ck, 'act_' + a.id, 'criteria')
  }

  // SVG height = y after last populated level
  const lastLv = [5,4,3,2,1,0].find(lv => countByLevel[lv] > 0) ?? 0
  const svgH = levelBaseY[lastLv] + levelTotalH(countByLevel[lastLv]) + PAD_Y

  return { nodes, edges, svgW, svgH, countByLevel, levelBaseY }
}

// ── Component ──────────────────────────────────────────────────────────────────
const ZOOM_STEPS = [0.5, 0.65, 0.8, 1.0, 1.25, 1.5]

export default function SystemGraphTab({ sys }: { sys: MtoSystem }) {
  const { nodes, edges, svgW, svgH, countByLevel, levelBaseY } = useMemo(() => buildGraph(sys), [sys])
  const nmap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoomIdx,    setZoomIdx]    = useState(3)   // index into ZOOM_STEPS (1.0 default)
  const zoom = ZOOM_STEPS[zoomIdx]

  const involvedIds = useMemo(() => {
    if (!selectedId) return null
    const s = new Set<string>([selectedId])
    for (const e of edges) {
      if (e.fromId === selectedId) s.add(e.toId)
      if (e.toId   === selectedId) s.add(e.fromId)
    }
    return s
  }, [selectedId, edges])

  if (!nodes.length) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">🕸️</div>
      <h3 className="font-display font-bold text-lg text-ink mb-2">No graph to show yet</h3>
      <p className="text-sm text-ink-muted max-w-sm">Add custom dimensions and assign rules to materials — the dependency graph will appear here.</p>
    </div>
  )

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 52px)' }}>

      {/* Toolbar — pinned */}
      <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-surface-200 bg-surface-50 flex-shrink-0">
        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap text-[10px] font-semibold">
          {([
            { k: 'system',   label: 'System' },
            { k: 'prim',     label: 'Primitive' },
            { k: 'custom',   label: 'Custom dim' },
            { k: 'criteria', label: 'Criteria' },
            { k: 'variant',  label: 'Variant' },
            { k: 'material', label: 'Material' },
            { k: 'bracket',  label: 'Bracket' },
            { k: 'activity', label: 'Activity' },
          ] as { k: CK; label: string }[]).map(({ k, label }) => (
            <div key={k} className="flex items-center gap-1">
              <div className="w-4 h-0.5" style={{ background: C[k].edge }} />
              <span className="text-ink-muted">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedId && (
            <span className="text-[10px] text-ink-faint">Click node or background to deselect</span>
          )}
          {/* Zoom controls */}
          <div className="flex items-center gap-0.5">
            <button onClick={() => setZoomIdx(i => Math.max(0, i - 1))} disabled={zoomIdx === 0}
              className="p-1.5 hover:bg-surface-200 disabled:opacity-30 text-ink-muted transition-colors" style={{ borderRadius: 'var(--radius)' }}>
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setZoomIdx(3)}
              className="px-2 py-1 hover:bg-surface-200 text-[10px] font-bold text-ink-muted w-12 text-center transition-colors" style={{ borderRadius: 'var(--radius)' }}>
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => setZoomIdx(i => Math.min(ZOOM_STEPS.length - 1, i + 1))} disabled={zoomIdx === ZOOM_STEPS.length - 1}
              className="p-1.5 hover:bg-surface-200 disabled:opacity-30 text-ink-muted transition-colors" style={{ borderRadius: 'var(--radius)' }}>
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setZoomIdx(3); setSelectedId(null) }}
              className="p-1.5 hover:bg-surface-200 text-ink-muted transition-colors" style={{ borderRadius: 'var(--radius)' }} title="Reset">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Graph canvas — fills remaining height */}
      <div className="flex-1 overflow-auto bg-surface-50"
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        {/* This div sets the true scrollable size after scaling */}
        <div style={{ width: Math.round(svgW * zoom), height: Math.round(svgH * zoom), position: 'relative', flexShrink: 0 }}
          onClick={() => setSelectedId(null)}>
          {/* Scaled content */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: svgW, height: svgH,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}>

            {/* Level labels + dividers */}
            {LEVEL_META.map((lv, i) => {
              if (!countByLevel[i]) return null
              const levelActive = !involvedIds || nodes.some(n => n.level === i && involvedIds.has(n.id))
              return (
                <div key={i}>
                  <div style={{
                    position: 'absolute', left: 0, top: levelBaseY[i],
                    width: svgW, display: 'flex', justifyContent: 'center',
                    pointerEvents: 'none',
                    opacity: levelActive ? 0.7 : 0.1,
                    transition: 'opacity 0.15s',
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: lv.color, textTransform: 'uppercase' }}>
                      {lv.label}
                    </span>
                  </div>
                  {i > 0 && countByLevel[i - 1] > 0 && (
                    <div style={{
                      position: 'absolute', left: PAD_X, right: PAD_X,
                      top: levelBaseY[i] - ROW_GAP / 2, height: 1,
                      background: '#f1f5f9', pointerEvents: 'none',
                      opacity: levelActive ? 1 : 0.15,
                      transition: 'opacity 0.15s',
                    }} />
                  )}
                </div>
              )
            })}

            {/* SVG edges */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: svgW, height: svgH, pointerEvents: 'none', overflow: 'visible' }}>
              <defs>
                {(Object.keys(C) as CK[]).map(k => (
                  <marker key={k} id={`arr-${k}`} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                    <path d="M0,0 L0,5 L5,2.5 z" fill={C[k].edge} opacity="0.8" />
                  </marker>
                ))}
              </defs>
              {edges.map((e, i) => {
                const fn = nmap.get(e.fromId), tn = nmap.get(e.toId)
                if (!fn || !tn) return null
                const active = !involvedIds || (involvedIds.has(e.fromId) && involvedIds.has(e.toId))
                return (
                  <path key={i}
                    d={curvePath(fn.x + NODE_W / 2, fn.y + NODE_H, tn.x + NODE_W / 2, tn.y)}
                    fill="none"
                    stroke={C[e.ck].edge}
                    strokeWidth={active ? 1.8 : 1}
                    strokeOpacity={active ? 0.75 : 0.07}
                    markerEnd={active ? `url(#arr-${e.ck})` : undefined}
                    style={{ transition: 'stroke-opacity 0.15s' }}
                  />
                )
              })}
            </svg>

            {/* Nodes */}
            {nodes.map(n => {
              const isSelected = n.id === selectedId
              const dimmed     = involvedIds ? !involvedIds.has(n.id) : false
              return (
                <div key={n.id}
                  onClick={ev => { ev.stopPropagation(); setSelectedId(id => id === n.id ? null : n.id) }}
                  style={{
                    position: 'absolute', left: n.x, top: n.y,
                    width: NODE_W, height: NODE_H,
                    background: C[n.ck].bg,
                    border: isSelected ? `2px solid ${C[n.ck].text}` : `1.5px solid ${C[n.ck].border}`,
                    borderRadius: 9,
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0 8px', boxSizing: 'border-box', overflow: 'hidden',
                    boxShadow: isSelected
                      ? `0 0 0 3px ${C[n.ck].edge}55, 0 2px 8px rgba(0,0,0,0.12)`
                      : '0 1px 3px rgba(0,0,0,0.06)',
                    opacity: dimmed ? 0.1 : 1,
                    cursor: 'pointer',
                    transition: 'opacity 0.15s, box-shadow 0.15s',
                  }}>
                  {n.ck === 'material' ? (
                    <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {n.photo ? <img src={n.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12 }}>📦</span>}
                    </div>
                  ) : n.icon ? (
                    <span style={{ fontSize: 12, flexShrink: 0, lineHeight: 1 }}>{n.icon}</span>
                  ) : null}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C[n.ck].text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.35 }}>
                      {n.label}
                    </div>
                    {n.sub && (
                      <div style={{ fontSize: 8.5, color: C[n.ck].text, opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                        {n.sub}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

          </div>{/* end scaled content */}
        </div>{/* end scroll size div */}
      </div>
    </div>
  )
}
