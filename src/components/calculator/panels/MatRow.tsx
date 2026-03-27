// src/components/calculator/panels/MatRow.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import type { Material, CustomDim, CustomCriterion, Variant, GlobalTag, RuleRow, InputModel } from '@/types'
import { PRIMITIVE_DIMS, RULE_TYPES, RULE_GROUPS, DIMS_FOR_INPUT_MODEL } from '@/lib/engine/constants'
import { nanoid } from 'nanoid'
import { Trash2, Edit3, Check, X, ChevronUp, ChevronDown, Plus, AlertTriangle, GitBranch, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { NumberInput } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import FloatingPanel from '../FloatingPanel'

// ─── Rule type descriptions ───────────────────────────────────────────────────

const RULE_DESCRIPTIONS: Record<string, { short: string; formula: string; example: string }> = {
  ratio:             { short: 'N units per N of a dimension (length, area, or custom)', formula: 'qty = dim_value × (ruleQty / ruleDivisor)', example: '2 bolts per 1 corner → corners × 2' },
  linear_metre:      { short: 'Quantity equals the linear metre value directly', formula: 'qty = length × ruleQty', example: 'Cable: ruleQty=1.05 → length × 1.05 m' },
  coverage_per_item: { short: 'Each item covers a given area in m²', formula: 'qty = ceil(area / ruleDivisor)', example: '1 sheet covers 3.6 m² → area ÷ 3.6, round up' },
  sheet_size:        { short: 'Sheets or tiles of given width × height covering area', formula: 'qty = ceil(area / (W/1000 × H/1000))', example: '600 × 600 mm floor tiles or 1200 × 2400 mm sheets' },
  kg_per_sqm:        { short: 'Weight in kg applied per m² of area', formula: 'qty = area × ruleQty (kg)', example: 'Primer: 0.3 kg/m² × area' },
  kg_per_metre:      { short: 'Weight in kg per metre of run', formula: 'qty = length × ruleQty (kg)', example: 'Steel bar: 2.4 kg/m × length' },
  kg_per_item:       { short: 'Weight in kg per count of a dimension', formula: 'qty = dimValue × ruleQty (kg)', example: '0.8 kg per corner bracket' },
  fixed_qty:         { short: 'Fixed quantity regardless of dimensions', formula: 'qty = ruleQty', example: 'Safety signage: always 1 set' },
  stock_length_qty:  { short: 'Uses the stock length solver — how many lengths are needed from the solver custom dim', formula: 'qty = bars_needed from solver for this length', example: 'One 6000mm bar from the Int Brackets solver' },
}

// ─── RuleFields ───────────────────────────────────────────────────────────────
function RuleFields({ row, onChange, customDims, inputModel }: {
  row: Partial<RuleRow> & { ruleType?: string | null }
  onChange: (k: keyof RuleRow, v: any) => void
  customDims: CustomDim[]
  inputModel: InputModel
}) {
  const rt = row.ruleType
  if (!rt) return <span className="text-xs text-ink-faint italic">Select rule type</span>

  const availableDimKeys = new Set(DIMS_FOR_INPUT_MODEL[inputModel] ?? [])
  const filteredPrimitiveDims = PRIMITIVE_DIMS.filter(d => availableDimKeys.has(d.key))
  const allDims = [...PRIMITIVE_DIMS, ...customDims]

  const DimSel = ({ field = 'ruleDimKey' }: { field?: keyof RuleRow }) => {
    const currentVal = (row as any)[field] ?? ''
    const isOrphaned = currentVal && currentVal !== '__area' && !filteredPrimitiveDims.some(d => d.key === currentVal) && !customDims.some(d => d.key === currentVal)
    return (
      <select value={currentVal} onChange={e => onChange(field, e.target.value)}
        className={`input text-xs py-1.5 ${!currentVal ? 'border-red-300' : isOrphaned ? 'border-amber-300' : ''}`}>
        <option value="">— select dim —</option>
        <optgroup label="Primitive">
          {filteredPrimitiveDims.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label} ({d.unit})</option>)}
          <option value="__area">⬛ Area (L × W) (m²)</option>
        </optgroup>
        {customDims.length > 0 && (
          <optgroup label="Custom">
            {customDims.map(d => <option key={d.key} value={d.key}>{d.icon ?? '🔗'} {d.name} ({d.unit})</option>)}
          </optgroup>
        )}
        {isOrphaned && (
          <option value={currentVal}>⚠️ {PRIMITIVE_DIMS.find(d => d.key === currentVal)?.label ?? currentVal} (incompatible)</option>
        )}
      </select>
    )
  }

  if (rt === 'stock_length_qty') {
    const solverDims = customDims.filter(cd => cd.derivType === 'stock_length')
    const cd = solverDims.find(d => d.key === row.ruleStockDimKey)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-3 flex-wrap">
          <div>
            <div className="label">Solver dim</div>
            <select value={row.ruleStockDimKey ?? ''} onChange={e => onChange('ruleStockDimKey', e.target.value)}
              className={`input text-xs py-1.5 min-w-36 ${!row.ruleStockDimKey ? 'border-red-300' : ''}`}>
              <option value="">— select solver dim —</option>
              {solverDims.map(d => <option key={d.key} value={d.key}>{d.icon ?? '📦'} {d.name}</option>)}
            </select>
          </div>
          {cd && (
            <div>
              <div className="label">This length (mm)</div>
              <select value={row.ruleStockLength ?? ''} onChange={e => onChange('ruleStockLength', parseFloat(e.target.value))}
                className={`input text-xs py-1.5 min-w-28 ${!row.ruleStockLength ? 'border-red-300' : ''}`}>
                <option value="">— length —</option>
                {(cd.stockLengths ?? []).sort((a, b) => a - b).map(l => <option key={l} value={l}>{l} mm</option>)}
              </select>
            </div>
          )}
        </div>
        {!row.ruleStockDimKey && <p className="text-xs text-red-600">Select a stock length solver dim above</p>}
      </div>
    )
  }

  if (rt === 'sheet_size') {
    return (
      <div className="flex gap-2 items-center text-xs">
        <NumberInput value={row.ruleTileW ?? 600} min={1} unit="mm" onChange={e => onChange('ruleTileW', parseFloat(e.target.value))} className="w-20" />
        <span className="text-ink-faint">×</span>
        <NumberInput value={row.ruleTileH ?? 600} min={1} unit="mm" onChange={e => onChange('ruleTileH', parseFloat(e.target.value))} className="w-20" />
      </div>
    )
  }

  if (rt === 'coverage_per_item') {
    return (
      <div className="flex gap-2 items-center text-xs">
        <span className="text-ink-faint">1 item covers</span>
        <NumberInput value={row.ruleDivisor ?? 1} unit="m²" onChange={e => onChange('ruleDivisor', parseFloat(e.target.value))} className="w-20" />
      </div>
    )
  }

  if (rt === 'kg_per_item') {
    return (
      <div className="flex gap-2 items-center text-xs">
        <NumberInput value={row.ruleQty ?? 1} unit="kg" onChange={e => onChange('ruleQty', parseFloat(e.target.value))} className="w-20" />
        <span className="text-ink-faint">per</span>
        <DimSel />
      </div>
    )
  }

  // Generic: ratio, linear_metre, kg_per_sqm, kg_per_metre, fixed_qty
  const showQty  = true
  const showDiv  = ['ratio'].includes(rt)
  const showDim  = ['ratio'].includes(rt)
  const unitLabel = ['kg_per_sqm','kg_per_metre'].includes(rt) ? 'kg' : ['linear_metre'].includes(rt) ? 'm' : ''

  return (
    <div className="flex gap-2 items-center text-xs flex-wrap">
      {showQty  && <NumberInput value={row.ruleQty ?? 1} step={0.01} unit={unitLabel || undefined} onChange={e => onChange('ruleQty', parseFloat(e.target.value))} className="w-20" />}
      {showDiv  && <><span className="text-ink-faint">per</span><NumberInput value={row.ruleDivisor ?? 1} step={0.01} onChange={e => onChange('ruleDivisor', parseFloat(e.target.value))} className="w-20" /></>}
      {showDim  ? <DimSel /> : null}
    </div>
  )
}

// ─── DependencyChain ──────────────────────────────────────────────────────────

// Which primitive dims does a given rule type implicitly read?
const RULE_IMPLICIT_DIMS: Record<string, string[]> = {
  ratio:             [],           // explicit via ruleDimKey (incl. __area → length,width)
  linear_metre:      ['length'],
  coverage_per_item: ['length', 'width'],
  sheet_size:        ['length', 'width'],
  kg_per_sqm:        ['length', 'width'],
  kg_per_metre:      ['length'],
  kg_per_item:       [],           // explicit via ruleDimKey
  fixed_qty:         [],
  stock_length_qty:  [],           // via ruleStockDimKey (custom dim)
}

function DependencyChain({ mat, ruleSet, criteriaKeys, customDims, customCriteria, variants, variantTags }: {
  mat: Material
  ruleSet: RuleRow[]
  criteriaKeys: string[]
  customDims: CustomDim[]
  customCriteria: CustomCriterion[]
  variants: Variant[]
  variantTags: Record<string, string>
}) {
  const allDims = [...PRIMITIVE_DIMS, ...customDims]

  // Collect input dims from all rules
  const inputDimKeys = new Set<string>()
  const conditionCriteriaKeys = new Set<string>()

  for (const row of ruleSet) {
    if (!row.ruleType) continue
    // Implicit dims
    const implicit = RULE_IMPLICIT_DIMS[row.ruleType] ?? []
    implicit.forEach(k => inputDimKeys.add(k))
    // Explicit dim
    if (row.ruleDimKey) inputDimKeys.add(row.ruleDimKey)
    // Stock solver dim (custom dim)
    if (row.ruleStockDimKey) inputDimKeys.add(row.ruleStockDimKey)
    // Per-row condition criteria
    if (row.condition?.criterionKey) conditionCriteriaKeys.add(row.condition.criterionKey)
  }

  const hasRules     = ruleSet.some(r => r.ruleType)
  const hasGates     = criteriaKeys.length > 0
  const hasConditions = conditionCriteriaKeys.size > 0
  const hasVariants  = Object.values(variantTags).some(Boolean)

  const ChipStyle = (color: string) => ({
    background: color + '14',
    borderColor: color + '40',
    color,
  })

  const Section = ({ title }: { title: string }) => (
    <div className="text-xs font-semibold text-ink mb-1 mt-3 first:mt-0">{title}</div>
  )

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="mb-3 pb-3 border-b border-surface-200">
        <div className="text-[10px] text-ink-faint italic leading-snug">
          Live summary of what this rule reads, conditions on, and produces.
        </div>
      </div>

      {!hasRules && (
        <p className="text-[10px] text-ink-faint italic">Add a rule row to see the dependency chain.</p>
      )}

      {/* INPUTS */}
      {inputDimKeys.size > 0 && (
        <div>
          <Section title="Reads (input dimensions)" />
          <div className="flex flex-col gap-1">
            {[...inputDimKeys].map(key => {
              const dim = allDims.find(d => d.key === key)
              const isCustom = customDims.some(cd => cd.key === key)
              return (
                <div key={key} className="flex items-center gap-1.5 text-[11px]">
                  <span className="leading-none">{(dim as any)?.icon ?? '🔗'}</span>
                  <span className="text-ink">{(dim as any)?.label ?? (dim as any)?.name ?? key}</span>
                  {isCustom && <span className="badge bg-violet-50 text-violet-600 text-[10px] px-1 py-0">custom</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* RULE ROWS summary */}
      {hasRules && (
        <div>
          <Section title="Rule rows" />
          <div className="flex flex-col gap-1.5">
            {ruleSet.map((row, idx) => {
              const rt     = RULE_TYPES.find(r => r.value === row.ruleType)
              const grp    = rt ? RULE_GROUPS.find(g => g.id === rt.group) : null
              const condCr = row.condition ? customCriteria.find(c => c.key === row.condition!.criterionKey) : null
              if (!rt) return null
              return (
                <div key={row.id} className="rounded border border-surface-200 bg-surface-50 px-2.5 py-2"
                  style={{ borderRadius: 'var(--radius)' }}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {idx > 0 && <span className="text-[10px] text-ink font-bold">ELSE IF</span>}
                    {condCr && (
                      <span className="text-[10px] font-semibold rounded px-1 py-0.5"
                        style={ChipStyle(condCr.color ?? '#0891b2')}>
                        {condCr.icon} {condCr.name} = {row.condition?.whenValue ? 'ON' : 'OFF'}
                      </span>
                    )}
                    {!condCr && idx > 0 && <span className="text-[10px] text-ink-faint">always</span>}
                  </div>
                  {grp && (
                    <div className="mt-1 font-semibold text-[10px]" style={{ color: grp.color }}>{grp.icon} {rt.label}</div>
                  )}
                  {row.waste > 0 && <div className="text-[10px] text-ink-faint mt-0.5">+{row.waste}% waste</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* GLOBAL GATE */}
      {hasGates && (
        <div>
          <Section title="Blocked when" />
          <div className="flex flex-col gap-1">
            {criteriaKeys.map(key => {
              const cr = customCriteria.find(c => c.key === key)
              if (!cr) return null
              return (
                <div key={key} className="flex items-center gap-1.5 text-[11px] rounded px-2 py-1"
                  style={ChipStyle(cr.color ?? '#dc2626')}>
                  {cr.icon} {cr.name} is OFF
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* VARIANT TAGS */}
      {hasVariants && (
        <div>
          <Section title="Variant tag" />
          <div className="flex flex-col gap-1">
            {variants.map(v => {
              const tag = variantTags[v.id]
              if (!tag) return null
              return (
                <div key={v.id} className="text-[11px] rounded px-2 py-1 bg-primary/5 text-primary border border-primary/20">
                  {v.icon} {v.name}: {tag}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* OUTPUT */}
      {hasRules && (
        <div>
          <Section title="Output" />
          <div className="rounded border border-surface-200 bg-surface-50 px-2.5 py-2"
            style={{ borderRadius: 'var(--radius)' }}>
            <div className="font-semibold text-ink text-[11px]">{mat.name}</div>
            <div className="text-[10px] text-ink-faint">{mat.unit}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── InlineRuleEditor ─────────────────────────────────────────────────────────
export function InlineRuleEditor({ mat, onSave, onClose, customDims, customCriteria, variants, embedded = false, inputModel = 'linear', hideCondition = false }: {
  mat: Material; onSave: (m: Material) => void; onClose: () => void
  customDims: CustomDim[]; customCriteria: CustomCriterion[]; variants: Variant[]
  embedded?: boolean   // when true: auto-saves on every change, hides header/footer buttons
  inputModel?: InputModel
  hideCondition?: boolean  // when true: hides the per-row "When" condition (used for brackets)
}) {
  const [ruleSet, setRuleSet]           = useState<RuleRow[]>(mat.ruleSet ?? [])
  const [criteriaKeys, setCriteriaKeys] = useState<string[]>(mat.criteriaKeys ?? [])
  const [variantTags, setVariantTags]   = useState<Record<string, string>>(mat.variantTags ?? {})
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null)
  const [showDepChain, setShowDepChain] = useState(false)
  const isFirstRender = useRef(true)

  // Auto-save on every change when embedded (no separate Save button)
  useEffect(() => {
    if (!embedded) return
    if (isFirstRender.current) { isFirstRender.current = false; return }
    onSave({ ...mat, ruleSet, criteriaKeys, variantTags })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleSet, criteriaKeys, variantTags, embedded])

  const allDims = [...PRIMITIVE_DIMS, ...customDims]

  const newRuleRow = (): RuleRow => ({
    id: 'r_' + nanoid(6), condition: null, ruleType: null,
    ruleQty: 1, ruleDivisor: 1, ruleDimKey: '',
    ruleTileW: 600, ruleTileH: 600, waste: 0,
    ruleStockDimKey: '', ruleStockLength: 0,
  })

  const addRow    = () => setRuleSet(rs => [...rs, newRuleRow()])
  const updateRow = (id: string, patch: Partial<RuleRow>) => setRuleSet(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r))
  const deleteRow = (id: string) => setRuleSet(rs => rs.filter(r => r.id !== id))
  const moveUp    = (id: string) => setRuleSet(rs => { const i = rs.findIndex(r => r.id === id); if (i <= 0) return rs; const n = [...rs]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n })
  const moveDown  = (id: string) => setRuleSet(rs => { const i = rs.findIndex(r => r.id === id); if (i >= rs.length-1) return rs; const n = [...rs]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n })

  const save = () => onSave({ ...mat, ruleSet, criteriaKeys, variantTags })
  const clear = () => onSave({ ...mat, ruleSet: [], criteriaKeys: [], variantTags: {} })

  // Flat list of all variant leaves for tag dropdowns
  const getLeaves = (nodes: any[], path: string[] = []): { key: string; label: string }[] =>
    nodes.flatMap(n => {
      const here = [...path, n.label]
      return (n.children?.length ?? 0) === 0
        ? [{ key: n.key, label: here.join(' › ') }]
        : getLeaves(n.children, here)
    })

  return (
    <div className={embedded ? 'p-4' : 'p-5'}>
      {/* Header — hidden when embedded */}
      {!embedded && (
        <div className="flex items-center justify-between mb-5">
          <div className="text-xs font-semibold text-ink">Rules — <span className="text-ink-muted">{mat.name}</span></div>
          <Button size="xs" variant="ghost" onClick={onClose} icon={<X className="w-3 h-3" />}>Close</Button>
        </div>
      )}

      <div>
        <div className="flex-1 min-w-0 space-y-5">

          {/* Rule rows */}
          <div className="space-y-3">
            {ruleSet.length > 1 && (
              <p className="text-[11px] text-ink border border-surface-200 rounded-lg px-3 py-2" style={{ background: 'var(--color-surface-100)' }}>
                <strong>Multiple rows:</strong> rows are evaluated top-to-bottom. The first row whose <em>When</em> condition matches is used. Use "always" on the last row as a fallback.
              </p>
            )}

            {ruleSet.map((row, idx) => {
              const grp    = RULE_GROUPS.find(g => RULE_TYPES.find(rt => rt.value === row.ruleType)?.group === g.id)
              const condCr = row.condition ? customCriteria.find(c => c.key === row.condition!.criterionKey) : null
              const desc   = row.ruleType ? RULE_DESCRIPTIONS[row.ruleType] : null
              return (
                <div key={row.id} className="rounded-xl border border-surface-300 overflow-hidden">
                  {/* Row header tag */}
                  <div className="px-4 py-1.5 flex items-center gap-2 bg-surface-100 border-b border-surface-200">
                    <span className="text-[10px] font-bold text-ink uppercase tracking-wide">
                      {idx === 0 ? 'Rule' : 'Else if'}
                    </span>
                    {condCr && (
                      <span className="text-[10px] font-semibold rounded px-1.5 py-0.5"
                        style={{ background: (condCr.color ?? '#0891b2') + '18', color: condCr.color ?? '#0891b2' }}>
                        {condCr.icon} {condCr.name} = {row.condition?.whenValue ? 'ON' : 'OFF'}
                      </span>
                    )}
                    <div className="flex gap-1 ml-auto">
                      {idx > 0                  && <Button size="xs" variant="ghost" onClick={() => moveUp(row.id)}   icon={<ChevronUp   className="w-3 h-3" />} />}
                      {idx < ruleSet.length - 1 && <Button size="xs" variant="ghost" onClick={() => moveDown(row.id)} icon={<ChevronDown className="w-3 h-3" />} />}
                      <Button size="xs" variant="danger" onClick={() => setDeleteRuleId(row.id)} icon={<Trash2 className="w-3 h-3" />} />
                    </div>
                  </div>

                  <div className="px-4 py-3 flex flex-wrap gap-4 items-end bg-surface-50">
                    {/* Condition */}
                    {!hideCondition && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="label mb-0">When</span>
                        <span className="text-[10px] text-ink-faint">(condition for this row)</span>
                      </div>
                      <select value={row.condition ? row.condition.criterionKey + ':' + row.condition.whenValue : ''}
                        onChange={e => {
                          if (!e.target.value) { updateRow(row.id, { condition: null }); return }
                          const [key, val] = e.target.value.split(':')
                          updateRow(row.id, { condition: { criterionKey: key, whenValue: val === 'true' } })
                        }}
                        className="input text-xs py-1.5">
                        <option value="">— always apply —</option>
                        {customCriteria.map(cr => [
                          <option key={cr.key + ':true'}  value={cr.key + ':true'} >{cr.icon} {cr.name} is ON</option>,
                          <option key={cr.key + ':false'} value={cr.key + ':false'}>{cr.icon} {cr.name} is OFF</option>,
                        ])}
                      </select>
                    </div>
                    )}

                    {/* Rule type */}
                    <div>
                      <div className="label">Rule type</div>
                      {(() => {
                        const avail = new Set(DIMS_FOR_INPUT_MODEL[inputModel] ?? [])
                        const isAvailable = (rt: string) => {
                          const implicit = RULE_IMPLICIT_DIMS[rt] ?? []
                          return implicit.length === 0 || implicit.every(d => avail.has(d))
                        }
                        const currentOrphaned = row.ruleType && !isAvailable(row.ruleType)
                        return (
                          <select value={row.ruleType ?? ''} onChange={e => updateRow(row.id, { ruleType: e.target.value as any || null })}
                            className={`input text-xs py-1.5 min-w-52 ${currentOrphaned ? 'border-amber-300' : ''}`}>
                            <option value="">— unassigned —</option>
                            {RULE_GROUPS.map(g => {
                              const types = RULE_TYPES.filter(rt => rt.group === g.id && isAvailable(rt.value))
                              if (types.length === 0) return null
                              return (
                                <optgroup key={g.id} label={g.icon + '  ' + g.label}>
                                  {types.map(rt => (
                                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                                  ))}
                                </optgroup>
                              )
                            })}
                            {currentOrphaned && (
                              <option value={row.ruleType!}>⚠️ {RULE_TYPES.find(rt => rt.value === row.ruleType)?.label ?? row.ruleType} (incompatible)</option>
                            )}
                          </select>
                        )
                      })()}
                    </div>

                    {/* Rule fields */}
                    {row.ruleType && (
                      <div>
                        <div className="label">Parameters</div>
                        <RuleFields row={row} onChange={(k, v) => updateRow(row.id, { [k]: v })} customDims={customDims} inputModel={inputModel} />
                      </div>
                    )}

                    {/* Waste — hidden for solver-driven rules where waste is already computed */}
                    {row.ruleType && row.ruleType !== 'stock_length_qty' && (
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="label mb-0">Waste %</span>
                        </div>
                        <NumberInput value={row.waste ?? 0} min={0} max={100}
                          onChange={e => updateRow(row.id, { waste: parseFloat(e.target.value) })} className="w-20" />
                      </div>
                    )}
                  </div>

                  {/* Rule description + group badge */}
                  {(grp || desc) && (
                    <div className="px-4 py-2.5 flex flex-col gap-1 bg-surface-100 border-t border-surface-200">
                      {grp && (
                        <div className="flex items-center gap-2">
                          <span className="badge text-[10px] font-bold" style={{ background: grp.bg, color: grp.color, borderColor: grp.color + '30' }}>{grp.icon} {grp.label}</span>
                        </div>
                      )}
                      {desc && (
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-ink font-medium">{desc.short}</div>
                          <div className="font-mono text-[10px] text-ink-muted">{desc.formula}</div>
                          <div className="text-[10px] text-ink-faint italic">e.g. {desc.example}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            <button onClick={addRow}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary/30 rounded-xl py-3 text-xs font-semibold text-primary hover:border-primary hover:bg-primary/5 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Rule Row
            </button>
          </div>

          {/* Global gate */}
          {customCriteria.filter(c => c.type === 'input').length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="label mb-0">Global Gate</span>
                <span className="text-[10px] text-ink-faint">(hide entire material when these criteria are OFF)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {customCriteria.filter(c => c.type === 'input').map(cr => {
                  const active = criteriaKeys.includes(cr.key)
                  return (
                    <button key={cr.key} type="button"
                      onClick={() => setCriteriaKeys(ks => active ? ks.filter(k => k !== cr.key) : [...ks, cr.key])}
                      style={active ? { background: (cr.color ?? '#0891b2') + '14', color: cr.color ?? '#0891b2', borderColor: (cr.color ?? '#0891b2') + '40' } : undefined}
                      className="badge border border-surface-300 text-ink-muted px-3 py-1.5 cursor-pointer transition-all">
                      {cr.icon} {cr.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Variant tags */}
          {variants.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <span className="label mb-0">Variant Tags</span>
                <span className="text-[10px] text-ink-faint">(only include for selected variant leaf)</span>
              </div>
              {variants.map(v => {
                const leaves = getLeaves(v.nodes)
                return (
                  <div key={v.id}>
                    <div className="text-xs font-medium text-ink mb-1">{v.icon} {v.name}</div>
                    <select value={variantTags[v.id] ?? ''}
                      onChange={e => setVariantTags(vt => ({ ...vt, [v.id]: e.target.value || '' }))}
                      className="input text-xs py-1.5">
                      <option value="">— all variants (not filtered) —</option>
                      {leaves.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                    </select>
                  </div>
                )
              })}
            </div>
          )}

          {/* Actions — hidden when embedded (auto-saves) */}
          {!embedded && (
            <div className="flex gap-3 pt-2 border-t border-surface-300">
              <Button variant="primary" onClick={save} icon={<Check className="w-4 h-4" />}>Save Rules</Button>
              <Button variant="secondary" onClick={onClose} icon={<X className="w-4 h-4" />}>Cancel</Button>
              <Button size="sm" variant={showDepChain ? 'primary' : 'secondary'}
                onClick={() => setShowDepChain(v => !v)}
                icon={<GitBranch className="w-3 h-3" />}>
                Dependency Chain
              </Button>
              {ruleSet.length > 0 && (
                <Button variant="ghost" onClick={clear} className="ml-auto text-ink-faint">Clear all rules</Button>
              )}
            </div>
          )}

          {/* Dependency chain toggle for embedded mode */}
          {embedded && (
            <Button size="xs" variant={showDepChain ? 'primary' : 'secondary'}
              onClick={() => setShowDepChain(v => !v)}
              icon={<GitBranch className="w-3 h-3" />}>
              Dependency Chain
            </Button>
          )}
        </div>

        {/* Floating Dependency Chain panel */}
        <FloatingPanel open={showDepChain} onClose={() => setShowDepChain(false)} title="Dependency Chain"
          icon={<GitBranch className="w-3.5 h-3.5 text-primary" />} width="w-72">
          <DependencyChain
            mat={mat}
            ruleSet={ruleSet}
            criteriaKeys={criteriaKeys}
            customDims={customDims}
            customCriteria={customCriteria}
            variants={variants}
            variantTags={variantTags}
          />
        </FloatingPanel>
      </div>
      <ConfirmModal
        open={deleteRuleId !== null}
        title="Delete rule row?"
        message="This rule row will be permanently removed."
        onConfirm={() => { deleteRow(deleteRuleId!); setDeleteRuleId(null) }}
        onCancel={() => setDeleteRuleId(null)}
      />
    </div>
  )
}

// ─── MatRow ───────────────────────────────────────────────────────────────────
export type MatBadge = { type: 'solver' | 'plate' | 'unassigned' | 'bracket'; label: string }

interface MatRowProps {
  mat: Material; rowIndex: number
  inputModel: InputModel
  onSave: (m: Material) => void
  onDelete: (id: string) => void
  customDims: CustomDim[]; customCriteria: CustomCriterion[]; variants: Variant[]
  globalTags: GlobalTag[]
  allDims: (typeof PRIMITIVE_DIMS[number] | CustomDim)[] | typeof PRIMITIVE_DIMS
  library: any[]; onMakeUnique: (id: string) => void; onSyncFromLib: (id: string) => void
  isBracketMaterial?: boolean
  badge?: MatBadge
}

const BADGE_STYLES: Record<MatBadge['type'], { bg: string; color: string }> = {
  solver:     { bg: '#eff6ff', color: '#1d4ed8' },
  plate:      { bg: '#faf5ff', color: '#7c3aed' },
  unassigned: { bg: '#fffbeb', color: '#b45309' },
  bracket:    { bg: '#f5f3ff', color: '#6d28d9' },
}

export default function MatRow({ mat, rowIndex, inputModel, onSave, onDelete, customDims, customCriteria, variants, globalTags, library, onMakeUnique, onSyncFromLib, isBracketMaterial = false, badge }: MatRowProps) {
  const [editingRule,  setEditingRule]  = useState(false)
  const [changing,     setChanging]     = useState(false)
  const [changeQ,      setChangeQ]      = useState('')
  const [confirmDel,   setConfirmDel]   = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!changing) return
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setChanging(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [changing])

  const saveRule = (updated: Material) => { onSave(updated); setEditingRule(false) }

  const swapMaterial = (libItem: any) => {
    onSave({
      ...mat,
      name: libItem.name, unit: libItem.unit,
      notes: libItem.notes ?? '', photo: libItem.photo ?? null,
      productCode: libItem.productCode ?? '',
      category: libItem.category ?? 'other',
      properties: libItem.properties ?? {}, tags: libItem.tags ?? [],
      libraryRef: libItem.id, _libSyncedAt: Date.now(), _updatedAt: Date.now(),
    })
    setChanging(false)
  }

  const migrated   = mat  // already migrated upstream
  const hasRule    = (mat.ruleSet ?? []).some(r => r.ruleType)
  const primaryRow = (mat.ruleSet ?? []).find(r => r.ruleType)
  const grp        = primaryRow ? RULE_GROUPS.find(g => RULE_TYPES.find(rt => rt.value === primaryRow.ruleType)?.group === g.id) : null

  // Library status
  const libMat  = mat.libraryRef ? library.find((l: any) => l.id === mat.libraryRef) : null
  const isStale = libMat && (libMat._updatedAt ?? 0) > (mat._libSyncedAt ?? 0)

  return (
    <>
      <tr className={rowIndex % 2 === 0 ? 'bg-surface-50' : 'bg-surface-100'}>
        {/* Photo */}
        <td className="px-3 py-2 w-14">
          {mat.photo ? (
            <img src={mat.photo} alt={mat.name}
              className="w-10 h-10 object-cover flex-shrink-0"
              style={{ borderRadius: 'var(--radius)' }} />
          ) : (
            <div className="w-10 h-10 bg-surface-100 border border-surface-200 flex items-center justify-center flex-shrink-0"
              style={{ borderRadius: 'var(--radius)' }}>
              <span className="text-lg leading-none">📦</span>
            </div>
          )}
        </td>
        {/* Name */}
        <td className="px-4 py-2.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-ink">{mat.name}</span>
              {mat.productCode && <code className="text-[10px] bg-surface-100 text-ink-muted px-1.5 py-0.5 rounded">{mat.productCode}</code>}
              {badge && (
                <span className="badge text-[10px] px-1.5 py-0.5 font-semibold"
                  style={{ background: BADGE_STYLES[badge.type].bg, color: BADGE_STYLES[badge.type].color }}>
                  {badge.label}
                </span>
              )}
            </div>
            {mat.notes && <div className="text-xs text-ink-faint italic mt-0.5">{mat.notes}</div>}
            {mat.libraryRef ? (
              <div className="flex gap-2 mt-1 flex-wrap items-center">
                <span className="badge bg-emerald-50 text-emerald-700 text-[10px]">📚 Library</span>
                {isStale && (
                  <button onClick={() => onSyncFromLib(mat.id)} className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 font-semibold hover:bg-amber-100">
                    ⚠️ Sync now
                  </button>
                )}
                <span className="text-[10px] text-ink-faint">Edit in Logistics → Library</span>
                <button onClick={() => onMakeUnique(mat.id)} className="text-[10px] text-ink-faint hover:text-ink underline">🔓 Make unique</button>
              </div>
            ) : (
              mat._systemSpecific && <span className="badge bg-surface-100 text-ink-faint text-[10px] mt-1">🔧 System-specific</span>
            )}
            {(mat.tags ?? []).length > 0 && globalTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(mat.tags ?? []).map(tid => {
                  const t = globalTags.find((x: any) => x.id === tid)
                  return t ? (
                    <span key={tid} style={{ background: t.color + '18', color: t.color }}
                      className="badge text-[10px] px-2 font-bold">{t.name}</span>
                  ) : null
                })}
              </div>
            )}
          </div>
        </td>

        {/* Unit */}
        <td className="px-3 py-2.5">
          <span className="badge bg-surface-100 text-ink-muted text-xs">{mat.unit}</span>
        </td>

        {/* Rule */}
        <td className="px-3 py-2.5">
          {hasRule && grp ? (
            <div className="flex flex-col gap-1">
              <span className="badge text-[10px]" style={{ background: grp.bg, color: grp.color }}>{grp.icon} {grp.label}</span>
            </div>
          ) : isBracketMaterial ? (
            <span className="text-[10px] text-ink-faint italic">Rules on bracket</span>
          ) : (
            <span className="badge bg-amber-50 text-amber-700 text-[10px]"><AlertTriangle className="w-2.5 h-2.5" /> No rule</span>
          )}
        </td>

        {/* Actions */}
        <td className="px-3 py-2.5">
          <div className="flex gap-1 items-center">
            {!isBracketMaterial && (
              <Button size="xs" variant={editingRule ? 'primary' : 'ghost'}
                onClick={() => setEditingRule(v => !v)}
                icon={<Edit3 className="w-3 h-3" />}>
                <span className="hidden sm:inline">{editingRule ? 'Close' : 'Rules'}</span>
              </Button>
            )}
            <div ref={dropdownRef} className="relative">
              <Button size="xs" variant="secondary"
                onClick={() => { setChanging(v => !v); setChangeQ('') }}
                icon={<RefreshCw className="w-3 h-3 sm:hidden" />}>
                <span className="hidden sm:inline">Change</span>
              </Button>
              {changing && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-surface-50 border border-surface-200 shadow-float w-72 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
                  <div className="p-2 border-b border-surface-200">
                    <input autoFocus value={changeQ} onChange={e => setChangeQ(e.target.value)}
                      placeholder="Search library…" className="input text-xs py-1 w-full" />
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {library
                      .filter((l: any) => !changeQ.trim() || l.name.toLowerCase().includes(changeQ.toLowerCase()))
                      .map((l: any) => (
                        <button key={l.id} type="button" onMouseDown={() => swapMaterial(l)}
                          className={`w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-surface-100 transition-colors ${mat.libraryRef === l.id ? 'bg-primary/5' : ''}`}>
                          {l.photo
                            ? <img src={l.photo} alt={l.name} className="w-6 h-6 rounded object-cover flex-shrink-0" />
                            : <span className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">📦</span>
                          }
                          <span className="text-xs text-ink truncate flex-1">{l.name}</span>
                          <span className="text-[10px] text-ink-faint flex-shrink-0">{l.unit}</span>
                        </button>
                      ))}
                    {library.filter((l: any) => !changeQ.trim() || l.name.toLowerCase().includes(changeQ.toLowerCase())).length === 0 && (
                      <p className="text-xs text-ink-faint text-center py-4">No results</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <Button size="xs" variant="danger" onClick={() => setConfirmDel(true)} icon={<Trash2 className="w-3 h-3" />} />
          </div>
        </td>
      </tr>

      {editingRule && !isBracketMaterial && (
        <tr>
          <td colSpan={5} className="bg-primary/5 border-t border-b border-primary/20 px-0 py-0">
            <InlineRuleEditor
              mat={migrated} onSave={saveRule} onClose={() => setEditingRule(false)}
              customDims={customDims} customCriteria={customCriteria} variants={variants}
              inputModel={inputModel} />
          </td>
        </tr>
      )}
      <ConfirmModal
        open={confirmDel}
        title={`Delete "${mat.name}"?`}
        message="This material and all its rules will be removed from the system."
        onConfirm={() => { onDelete(mat.id); setConfirmDel(false) }}
        onCancel={() => setConfirmDel(false)}
      />
    </>
  )
}
