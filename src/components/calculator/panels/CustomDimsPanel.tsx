// src/components/calculator/panels/CustomDimsPanel.tsx
'use client'
import { useState } from 'react'
import type { CustomDim, CriteriaParamOverride, MtoSystem } from '@/types'
import { DERIV_TYPES, PRIMITIVE_DIMS, INPUT_MODELS, DIMS_FOR_INPUT_MODEL, getDimLabel, getDimUnit } from '@/lib/engine/constants'
import { nanoid } from 'nanoid'
import { Plus, Trash2, Edit3, Check, X, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Input, NumberInput } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { IconPicker }  from '@/components/ui/IconPicker'
import FloatingPanel from '../FloatingPanel'

interface Props {
  customDims: CustomDim[]
  onChange:   (dims: CustomDim[]) => void
  sysMats:    MtoSystem['materials']
  sys?:       MtoSystem
}

const BLANK: Omit<CustomDim, 'id'> = {
  key: '', name: '', unit: 'pcs', icon: '🔗', color: '#7c3aed',
  derivType: 'spacing', spacing: 1, spacingMode: 'fixed',
  spacingLabel: 'Spacing', spacingTargetDim: 'length',
  firstSupportMode: 'offset', firstGap: 300,
  includesEndpoints: false, sumKeys: [], formulaQty: 1, formulaDimKey: 'length',
  stockLengths: [], stockTargetDim: 'height', stockOptimMode: 'min_waste',
  plateMaterialId: '', partW: 600, partH: 400, kerf: 3,
  sheetAllowRotation: true, sheetPartsNeededDim: 'custom_a',
}

const DERIV_HELP: Record<string, { title: string; desc: string; formula: string; example: string }> = {
  spacing: {
    title: 'Spacing along a dimension',
    desc: 'Counts how many times a spacing interval fits along a dimension. Use this for supports, posts, brackets — anything that repeats at regular intervals.',
    formula: 'count = ⌈dimension ÷ spacing⌉ + 1',
    example: '6 m run ÷ 1.2 m spacing = 5 supports',
  },
  stock_length: {
    title: 'Stock length solver',
    desc: 'Finds the minimum number of standard-length pieces needed to cover a target dimension. Picks the best stock length to minimise waste.',
    formula: 'qty = ⌈target ÷ stock_length⌉',
    example: '8.4 m height → 3 × 3080 mm sections',
  },
  formula: {
    title: 'Formula (multiplier)',
    desc: 'Multiplies a primitive dimension by a constant. Use this for simple derived quantities like double-runs, perimeter lengths, or area-based counts.',
    formula: 'result = multiplier × dimension',
    example: '2 × perimeter → total twin-wire length',
  },
  sum: {
    title: 'Sum of dimensions',
    desc: 'Adds multiple primitive dimensions together. Useful when a material quantity depends on the combined total of several inputs.',
    formula: 'result = dim₁ + dim₂ + …',
    example: 'height + width → diagonal support length',
  },
  sheet_cut: {
    title: 'Sheet / plate nesting',
    desc: 'Calculates how many mother plates are needed to cut a required number of parts. Uses bin-packing and accounts for kerf width.',
    formula: 'sheets = ⌈parts_needed ÷ parts_per_sheet⌉',
    example: '12 brackets from 1200 × 2400 mm plates',
  },
}

const FIELD_GUIDE_ITEMS: Record<string, { label: string; desc: string }[]> = {
  spacing: [
    { label: 'Spacing along', desc: 'Which dimension items repeat along — e.g. length for horizontal runs, height for vertical columns.' },
    { label: 'Fixed / User', desc: 'Fixed = constant interval every job. User input = calculator exposes a spacing field per job.' },
    { label: 'First support', desc: 'None = intermediate only. Ground = first at 0 mm. Offset = first at a set gap from the start.' },
  ],
  formula: [
    { label: 'Multiplier', desc: 'Constant factor — e.g. 2 for twin-run or 1.1 to add 10% waste.' },
    { label: '× Dimension', desc: 'The primitive input being scaled. The result drives the quantity rule in materials.' },
  ],
  stock_length: [
    { label: 'Target dim', desc: 'The measured input to cover — e.g. Height for a vertical ladder run.' },
    { label: 'Stock lengths', desc: 'Available piece sizes from your supplier (mm). The solver picks the best fit to minimise offcut waste.' },
  ],
  sheet_cut: [
    { label: 'Mother plate', desc: 'A system material with width × length set — the raw sheet being cut from.' },
    { label: 'Part W × H', desc: 'Dimensions of each cut part. Solver fits as many parts per plate as possible.' },
    { label: 'Kerf', desc: 'Blade width lost per cut (mm) — factored into nesting to avoid under-ordering.' },
    { label: 'Parts needed from', desc: 'Which dimension determines how many parts are required.' },
  ],
  sum: [
    { label: 'Sum of dims', desc: 'Selected inputs are added together and used as the quantity rule in materials.' },
  ],
}

function FieldGuide({ derivType, items }: { derivType: string; items: { label: string; desc: string }[] }) {
  const h = DERIV_HELP[derivType]
  return (
    <div className="bg-surface-100 border border-surface-200 px-4 py-3 animate-fade-in"
      style={{ borderRadius: 'var(--radius)' }}>
      {h && (
        <div className="mb-3 pb-3 border-b border-surface-200">
          <div className="text-xs font-semibold text-ink mb-0.5">{h.title}</div>
          <div className="font-mono text-[11px] text-primary mb-1">{h.formula}</div>
          <div className="text-[10px] text-ink-faint italic">{h.example}</div>
        </div>
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {items.map(item => (
          <div key={item.label} className="min-w-[200px] flex-1">
            <div className="text-xs font-semibold text-ink mb-0.5">{item.label}</div>
            <div className="text-[10px] text-ink-faint italic leading-snug">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Model Strategies Section (#5) ────────────────────────────────────────────

function ModelStrategiesSection({ d, set, dimOptions }: {
  d: any; set: (k: any) => (v: any) => void
  dimOptions: { value: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const strategies: Record<string, any> = (d as any).modelStrategies ?? {}
  const activeModels = Object.keys(strategies)

  const toggle = (model: string) => {
    const next = { ...strategies }
    if (next[model]) { delete next[model] } else { next[model] = {} }
    set('modelStrategies')(Object.keys(next).length > 0 ? next : undefined)
  }

  const updateStrategy = (model: string, key: string, value: any) => {
    const next = { ...strategies, [model]: { ...strategies[model], [key]: value } }
    set('modelStrategies')(next)
  }

  return (
    <div className="border-t border-surface-200 pt-3 mt-1">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint hover:text-ink flex items-center gap-1">
        {open ? '▾' : '▸'} Per-model overrides
        {activeModels.length > 0 && <span className="text-primary ml-1">({activeModels.length})</span>}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {INPUT_MODELS.map(m => {
            const active = !!strategies[m.value]
            const strat = strategies[m.value] ?? {}
            return (
              <div key={m.value} className={`border px-3 py-2 ${active ? 'border-primary/30 bg-primary/5' : 'border-surface-200 bg-surface-50'}`}
                style={{ borderRadius: 'var(--radius)' }}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={active} onChange={() => toggle(m.value)} className="w-3.5 h-3.5 accent-primary" />
                  <span className="text-xs font-semibold">{m.icon} {m.label}</span>
                  <span className="text-[10px] text-ink-faint">{m.desc}</span>
                </label>
                {active && (
                  <div className="flex flex-wrap gap-3 mt-2 pl-5">
                    <Select label="Derivation type" value={strat.derivType ?? d.derivType}
                      onChange={e => updateStrategy(m.value, 'derivType', e.target.value || undefined)}
                      options={[
                        { value: '', label: '(inherit default)' },
                        ...DERIV_TYPES.map(t => ({ value: t.value, label: t.icon + ' ' + t.label })),
                      ]}
                      className="w-48" />
                    {(strat.derivType ?? d.derivType) === 'spacing' && (
                      <>
                        <NumberInput label="Spacing" value={strat.spacing ?? d.spacing ?? 1} min={0.01} step={0.1}
                          onChange={e => updateStrategy(m.value, 'spacing', parseFloat(e.target.value))} className="w-24" />
                        <Select label="Along" value={strat.spacingTargetDim ?? d.spacingTargetDim ?? 'length'}
                          onChange={e => updateStrategy(m.value, 'spacingTargetDim', e.target.value)}
                          options={dimOptions} className="w-36" />
                      </>
                    )}
                    {(strat.derivType ?? d.derivType) === 'formula' && (
                      <>
                        <NumberInput label="Multiplier" value={strat.formulaQty ?? d.formulaQty ?? 1} step={0.1}
                          onChange={e => updateStrategy(m.value, 'formulaQty', parseFloat(e.target.value))} className="w-24" />
                        <Select label="x Dimension" value={strat.formulaDimKey ?? d.formulaDimKey ?? 'length'}
                          onChange={e => updateStrategy(m.value, 'formulaDimKey', e.target.value)}
                          options={dimOptions} className="w-36" />
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Criteria Overrides Section (#1) ──────────────────────────────────────────

function CriteriaOverridesSection({ d, set, criteria }: {
  d: any; set: (k: any) => (v: any) => void
  criteria: { id: string; key: string; name: string; type: string }[]
}) {
  const [open, setOpen] = useState(false)
  const overrides: CriteriaParamOverride[] = (d as any).criteriaOverrides ?? []
  const inputCriteria = criteria.filter(c => c.type === 'input')

  const [addCritKey, setAddCritKey]     = useState('')
  const [addWhenActive, setAddWhenActive] = useState(true)
  const [addParamKey, setAddParamKey]   = useState('spacing')
  const [addParamVal, setAddParamVal]   = useState('')

  const addOverride = () => {
    if (!addCritKey || !addParamKey || addParamVal === '') return
    const val = isNaN(Number(addParamVal)) ? addParamVal : Number(addParamVal)
    const next = [...overrides, { criterionKey: addCritKey, whenActive: addWhenActive, params: { [addParamKey]: val } }]
    set('criteriaOverrides')(next)
    setAddParamVal('')
  }

  const removeOverride = (i: number) => {
    const next = overrides.filter((_, j) => j !== i)
    set('criteriaOverrides')(next.length > 0 ? next : undefined)
  }

  if (inputCriteria.length === 0) return null

  const OVERRIDABLE_PARAMS = [
    { value: 'derivType',          label: 'Derivation type' },
    { value: 'spacing',            label: 'Spacing value' },
    { value: 'formulaQty',         label: 'Multiplier' },
    { value: 'formulaDimKey',      label: 'Formula dim' },
    { value: 'spacingTargetDim',   label: 'Spacing dim' },
    { value: 'includesEndpoints',  label: 'Includes endpoints' },
    { value: 'firstSupportMode',   label: 'First support mode' },
    { value: 'firstGap',           label: 'First gap' },
    // stock_length
    { value: 'stockTargetDim',     label: 'Stock target dim' },
    { value: 'stockLengths',       label: 'Stock lengths' },
    { value: 'stockOptimMode',     label: 'Stock optim mode' },
    // sheet_cut
    { value: 'plateMaterialId',    label: 'Plate material' },
    { value: 'partW',              label: 'Part width' },
    { value: 'partH',              label: 'Part height' },
    { value: 'kerf',               label: 'Kerf' },
    { value: 'sheetAllowRotation', label: 'Allow rotation' },
  ]

  return (
    <div className="border-t border-surface-200 pt-3 mt-1">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint hover:text-ink flex items-center gap-1">
        {open ? '▾' : '▸'} Criteria overrides
        {overrides.length > 0 && <span className="text-primary ml-1">({overrides.length})</span>}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {/* Existing overrides */}
          {overrides.map((co, i) => {
            const crit = criteria.find(c => c.key === co.criterionKey)
            const paramEntries = Object.entries(co.params)
            return (
              <div key={i} className="flex items-center gap-2 text-xs bg-surface-100 border border-surface-200 px-2.5 py-1.5"
                style={{ borderRadius: 'var(--radius)' }}>
                <span className="font-semibold text-ink">{crit?.name ?? co.criterionKey}</span>
                <span className={`text-[10px] px-1.5 py-0.5 font-semibold ${co.whenActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  style={{ borderRadius: 'var(--radius)' }}>
                  {co.whenActive ? 'ON' : 'OFF'}
                </span>
                <span className="text-ink-faint">&rarr;</span>
                {paramEntries.map(([k, v]) => (
                  <span key={k} className="font-mono text-primary">{k}: {String(v)}</span>
                ))}
                <button onClick={() => removeOverride(i)} className="ml-auto text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
              </div>
            )
          })}

          {/* Add new override */}
          <div className="flex flex-wrap gap-2 items-end">
            <Select label="Criterion" value={addCritKey}
              onChange={e => setAddCritKey(e.target.value)}
              options={[{ value: '', label: '— select —' }, ...inputCriteria.map(c => ({ value: c.key, label: c.name }))]}
              className="w-36" />
            <div className="flex flex-col gap-1">
              <label className="label">When</label>
              <div className="flex overflow-hidden border border-surface-300" style={{ borderRadius: 'var(--radius)' }}>
                {[{ val: true, l: 'ON' }, { val: false, l: 'OFF' }].map((opt, i) => (
                  <button key={String(opt.val)} type="button"
                    onClick={() => setAddWhenActive(opt.val)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-all ${i > 0 ? 'border-l border-surface-300' : ''} ${addWhenActive === opt.val ? 'bg-ink text-surface-50' : 'bg-surface-50 text-ink-muted hover:bg-surface-100'}`}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
            <Select label="Param" value={addParamKey}
              onChange={e => setAddParamKey(e.target.value)}
              options={OVERRIDABLE_PARAMS}
              className="w-36" />
            <Input label="Value" value={addParamVal}
              onChange={e => setAddParamVal(e.target.value)}
              placeholder="e.g. 3.0" className="w-24" />
            <Button size="sm" variant="secondary" onClick={addOverride} icon={<Plus className="w-3 h-3" />}>Add</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CustomDimsPanel({ customDims, onChange, sysMats, sys }: Props) {
  const derivedDims = customDims.filter(cd => cd.derivType !== 'user_input')
  const [adding, setAdding]           = useState(false)
  const [draft, setDraft]             = useState<typeof BLANK>({ ...BLANK })
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editDraft, setEditDraft]     = useState<CustomDim | null>(null)
  const [deleteId,  setDeleteId]      = useState<string | null>(null)
  const [newStockLen, setNewStockLen] = useState('')
  const [newStockLenEdit, setNewStockLenEdit] = useState('')

  const sd = (k: keyof typeof BLANK) => (v: any) => setDraft(d => ({ ...d, [k]: v }))
  const se = (k: keyof CustomDim)     => (v: any) => setEditDraft(d => d ? { ...d, [k]: v } : d)

  const plateMats = sysMats.filter(m => {
    const p = m.properties ?? {}
    return p.width_mm && p.length_mm
  })

  const add = () => {
    if (!draft.name.trim()) return
    const key = draft.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).slice(2, 5)
    onChange([...customDims, { ...draft, id: nanoid(), key }])
    setDraft({ ...BLANK })
    setAdding(false)
    setNewStockLen('')
  }

  const remove    = (id: string) => onChange(customDims.filter(cd => cd.id !== id))
  const startEdit = (cd: CustomDim) => { setEditingId(cd.id); setEditDraft({ ...cd }); setAdding(false) }
  const cancelEdit = () => { setEditingId(null); setEditDraft(null) }
  const saveEdit = () => {
    if (!editDraft?.name.trim()) return
    onChange(customDims.map(cd => cd.id === editingId ? { ...editDraft } : cd))
    cancelEdit()
  }

  const addStockLen = (d: typeof BLANK | CustomDim, setter: (v: number[]) => void, raw: string, setRaw: (v: string) => void) => {
    const val = parseFloat(raw)
    if (val > 0) { setter([...(d.stockLengths ?? []), val].sort((a, b) => a - b)); setRaw('') }
  }

  const DimForm = ({ d, set, isEdit, precedingDims }: { d: typeof BLANK | CustomDim; set: (k: any) => (v: any) => void; isEdit: boolean; precedingDims: CustomDim[] }) => {
    const stockRaw    = isEdit ? newStockLenEdit : newStockLen
    const setStockRaw = isEdit ? setNewStockLenEdit : setNewStockLen
    const [guideOpen, setGuideOpen] = useState(false)
    const guideItems = FIELD_GUIDE_ITEMS[d.derivType] ?? []
    // Build combined dim options: primitives (filtered by input model) + custom dims that appear before this one
    const allowedKeys = new Set(DIMS_FOR_INPUT_MODEL[sys?.inputModel ?? ''] ?? PRIMITIVE_DIMS.map(p => p.key))
    const filteredPrims = PRIMITIVE_DIMS.filter(p => allowedKeys.has(p.key))
    const dimOptions = [
      ...filteredPrims.map(p => ({ value: p.key, label: p.icon + ' ' + getDimLabel(p.key, sys?.dimOverrides), group: 'Primitive' as const })),
      ...precedingDims.map(cd => ({ value: cd.key, label: cd.icon + ' ' + cd.name + (cd.unit ? ` (${cd.unit})` : ''), group: 'Custom' as const })),
    ]
    return (
      <div className="space-y-3">
        {/* Fields */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Row 1: identity — always shown */}
          <div className="flex flex-wrap gap-4 items-start">
            <Input label="Name" value={d.name} onChange={e => set('name')(e.target.value)} placeholder="e.g. Wall Brackets" className="w-44" />
            <Input label="Unit" value={d.unit} onChange={e => set('unit')(e.target.value)} className="w-16" />
            <IconPicker label="Icon" value={d.icon} onChange={v => set('icon')(v)} />
            <ColorPicker label="Colour" value={d.color} onChange={v => set('color')(v)} />
            <Select label="Derivation type" value={d.derivType}
              onChange={e => set('derivType')(e.target.value)}
              options={DERIV_TYPES.filter(t => {
                if (t.value === 'user_input') return false
                const modelDims = new Set(DIMS_FOR_INPUT_MODEL[sys?.inputModel ?? 'linear'] ?? [])
                // area needs length+width; spacing needs length
                if (t.value === 'area' && (!modelDims.has('length') || !modelDims.has('width'))) return false
                if (t.value === 'spacing' && !modelDims.has('length')) return false
                return true
              }).map(t => ({ value: t.value, label: t.icon + ' ' + t.label }))}
              className="w-52" />
            <label className="flex items-center gap-2 self-end pb-1 cursor-pointer">
              <input type="checkbox" checked={(d as any).allowOverride ?? false}
                onChange={e => set('allowOverride')(e.target.checked)} className="w-3.5 h-3.5 accent-primary" />
              <span className="text-[10px] font-semibold text-ink-muted">Allow user override</span>
            </label>
          </div>

          {/* Row 2: type-specific fields */}
          {d.derivType === 'area' && (
            <p className="text-[10px] text-ink-faint italic col-span-2">
              Automatically computes Length × Width — no additional configuration needed.
            </p>
          )}
          {d.derivType === 'spacing' && (
            <div className="flex flex-wrap gap-4 items-start">
              <Select label="Spacing along" value={(d as any).spacingTargetDim ?? 'length'}
                onChange={e => set('spacingTargetDim')(e.target.value)}
                options={dimOptions}
                className="w-40" />
              <div className="flex flex-col gap-1">
                <label className="label">Spacing value</label>
                <div className="flex overflow-hidden border border-surface-300" style={{ borderRadius: 'var(--radius)' }}>
                  {[{ val: 'fixed', l: 'Fixed' }, { val: 'user', l: 'User input' }].map((opt, i) => (
                    <button key={opt.val} type="button"
                      onClick={() => set('spacingMode')(opt.val)}
                      className={`px-3 py-1.5 text-xs font-semibold transition-all ${i > 0 ? 'border-l border-surface-300' : ''} ${d.spacingMode === opt.val ? 'bg-ink text-surface-50' : 'bg-surface-50 text-ink-muted hover:bg-surface-100'}`}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              {d.spacingMode === 'fixed' && (
                <NumberInput label={`Spacing (${getDimUnit((d as any).spacingTargetDim ?? 'length', sys?.dimOverrides)})`} value={(d as any).spacing ?? 1} min={0.01} step={0.1}
                  onChange={e => set('spacing')(parseFloat(e.target.value))} className="w-28" />
              )}
              {d.spacingMode === 'user' && (
                <Input label="Label in calculator" value={(d as any).spacingLabel ?? 'Spacing'}
                  onChange={e => set('spacingLabel')(e.target.value)} className="w-44" />
              )}
              <Select label="First support" value={(d as any).firstSupportMode ?? 'none'}
                onChange={e => set('firstSupportMode')(e.target.value)}
                options={[{ value: 'none', label: 'None (intermediate only)' }, { value: 'ground', label: 'At ground (0mm)' }, { value: 'offset', label: 'Offset from ground' }]}
                className="w-52" />
              {(d as any).firstSupportMode === 'offset' && (
                <NumberInput label={`First gap (${getDimUnit((d as any).spacingTargetDim ?? 'length', sys?.dimOverrides)})`} value={(d as any).firstGap ?? 300} min={0} step={10}
                  onChange={e => set('firstGap')(parseFloat(e.target.value))} className="w-28" />
              )}
            </div>
          )}

          {d.derivType === 'formula' && (
            <div className="flex flex-wrap gap-4 items-start">
              <NumberInput label="Multiplier" value={(d as any).formulaQty ?? 1} step={0.1}
                onChange={e => set('formulaQty')(parseFloat(e.target.value))} className="w-24" />
              <Select label="× Dimension" value={(d as any).formulaDimKey ?? 'length'}
                onChange={e => set('formulaDimKey')(e.target.value)}
                options={dimOptions}
                className="w-44" />
            </div>
          )}

          {d.derivType === 'stock_length' && (
            <div className="flex flex-wrap gap-4 items-start">
              <Select label="Target dim" value={(d as any).stockTargetDim ?? 'height'}
                onChange={e => set('stockTargetDim')(e.target.value)}
                options={dimOptions}
                className="w-44" />
              <div className="flex flex-col gap-2">
                <label className="label">Stock lengths (mm)</label>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {(d.stockLengths ?? []).map((l, i) => (
                    <span key={i} className="badge bg-surface-100 text-ink-muted border border-surface-200 gap-1">
                      {l}mm
                      <button onClick={() => set('stockLengths')((d.stockLengths ?? []).filter((_, j) => j !== i))}
                        className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <NumberInput placeholder="e.g. 3080" value={stockRaw}
                    onChange={e => setStockRaw(e.target.value)} className="w-28"
                    onKeyDown={e => { if (e.key === 'Enter') addStockLen(d, v => set('stockLengths')(v), stockRaw, setStockRaw) }} />
                  <Button size="sm" variant="secondary" onClick={() => addStockLen(d, v => set('stockLengths')(v), stockRaw, setStockRaw)}>
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {d.derivType === 'sheet_cut' && (
            <div className="space-y-3">
              <div>
                <label className="label">Mother plate (from system materials with plate properties)</label>
                <select value={(d as any).plateMaterialId ?? ''}
                  onChange={e => set('plateMaterialId')(e.target.value)}
                  className={`input ${(d as any).plateMaterialId ? 'border-primary' : 'border-red-300'}`}>
                  <option value="">— select a plate material —</option>
                  {plateMats.map(m => {
                    const p = m.properties ?? {}
                    return <option key={m.id} value={m.id}>{m.name} ({p.width_mm}×{p.length_mm}mm{p.thk_mm ? ' t' + p.thk_mm : ''})</option>
                  })}
                </select>
                {plateMats.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ No materials with plate properties yet. Add a material with width/length properties first.</p>
                )}
              </div>
              <div className="flex flex-wrap gap-4 items-start">
                <NumberInput label="Part W (mm)" value={(d as any).partW ?? 600} min={1} step={1} onChange={e => set('partW')(parseFloat(e.target.value))} className="w-28" />
                <NumberInput label="Part H (mm)" value={(d as any).partH ?? 400} min={1} step={1} onChange={e => set('partH')(parseFloat(e.target.value))} className="w-28" />
                <NumberInput label="Kerf (mm)"   value={(d as any).kerf ?? 0}   min={0} step={0.5} onChange={e => set('kerf')(parseFloat(e.target.value))} className="w-24" />
                <Select label="Parts needed from" value={(d as any).sheetPartsNeededDim ?? 'custom_a'}
                  onChange={e => set('sheetPartsNeededDim')(e.target.value)}
                  options={dimOptions}
                  className="w-44" />
                <div className="flex flex-col gap-1">
                  <label className="label">Allow rotation</label>
                  <label className="flex items-center gap-2 cursor-pointer py-2">
                    <input type="checkbox" checked={(d as any).sheetAllowRotation !== false}
                      onChange={e => set('sheetAllowRotation')(e.target.checked)} className="w-4 h-4" />
                    <span className="text-xs text-ink">Try rotated orientation</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {d.derivType === 'sum' && (
            <div className="space-y-2">
              <label className="label">Sum of dimensions</label>
              <div className="flex flex-wrap gap-2">
                {dimOptions.filter(o => !['area'].includes(o.value)).map(o => {
                  const checked = (d.sumKeys ?? []).includes(o.value)
                  return (
                    <label key={o.value}
                      className={`flex items-center gap-1.5 cursor-pointer border px-3 py-1.5 text-xs font-semibold transition-all ${checked ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface-50 border-surface-300 text-ink-muted hover:bg-surface-100'}`}
                      style={{ borderRadius: 'var(--radius)' }}>
                      <input type="checkbox" checked={checked} className="sr-only"
                        onChange={e => set('sumKeys')(e.target.checked ? [...(d.sumKeys ?? []), o.value] : (d.sumKeys ?? []).filter(k => k !== o.value))} />
                      {o.label}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Field Guide floating toggle */}
        {guideItems.length > 0 && (
          <>
            <Button size="xs" variant={guideOpen ? 'primary' : 'secondary'}
              onClick={() => setGuideOpen(v => !v)}
              icon={<BookOpen className="w-3 h-3" />}>
              Field Guide
            </Button>
            <FloatingPanel open={guideOpen} onClose={() => setGuideOpen(false)} title="Field Guide"
              icon={<BookOpen className="w-3.5 h-3.5 text-primary" />} width="w-80">
              <FieldGuide derivType={d.derivType} items={guideItems} />
            </FloatingPanel>
          </>
        )}

        {/* Model strategy overrides (#5) */}
        <ModelStrategiesSection d={d} set={set} dimOptions={dimOptions} />

        {/* Criteria param overrides (#1) */}
        {sys && <CriteriaOverridesSection d={d} set={set} criteria={sys.customCriteria ?? []} />}
      </div>
    )
  }

  return (
    <div className="border border-surface-200 bg-surface-50 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'var(--color-surface-100)', borderColor: 'var(--color-surface-200)' }}>
        <div>
          <h3 className="font-semibold text-sm text-ink">🔗 Custom Dimensions</h3>
          <p className="text-xs text-ink-muted mt-0.5">Derived quantities referenced in material rules.</p>
        </div>
        <Button size="sm" onClick={() => setAdding(v => !v)} icon={<Plus className="w-3.5 h-3.5" />}>
          Add Dim
        </Button>
      </div>

      {adding && (
        <div className="p-5 bg-surface-100 border-b border-surface-200">
          <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-4">New Custom Dimension</div>
          <DimForm d={draft} set={sd} isEdit={false} precedingDims={derivedDims} />
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="primary" onClick={add} icon={<Check className="w-3.5 h-3.5" />}>Add</Button>
            <Button size="sm" variant="secondary" onClick={() => setAdding(false)} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
          </div>
        </div>
      )}

      {derivedDims.length === 0 && !adding && (
        <div className="py-10 text-center text-sm text-ink-faint">No derived dimensions yet.</div>
      )}

      <div className="divide-y divide-surface-200">
        {derivedDims.map((cd, cdIdx) => {
          const dt   = DERIV_TYPES.find(t => t.value === cd.derivType)
          const isEd = editingId === cd.id
          return (
            <div key={cd.id} className={isEd ? 'bg-primary/5' : ''}>
              <div className="px-5 py-3 flex items-start gap-3">
                <div className="w-9 h-9 flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: cd.color + '18', border: '1.5px solid ' + cd.color + '30', borderRadius: 'var(--radius-card)' }}>
                  {cd.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-ink">{cd.name}</span>
                    <code className="text-[10px] bg-surface-100 text-ink-muted px-1.5 py-0.5"
                      style={{ borderRadius: 'var(--radius)' }}>{cd.key}</code>
                    <span className="badge bg-surface-100 text-ink-faint text-[10px]">{dt?.icon} {dt?.label}</span>
                  </div>
                  <div className="text-xs text-ink-faint mt-0.5">
                    {cd.derivType === 'stock_length' && `Target: ${cd.stockTargetDim} · ${cd.stockLengths.length} lengths`}
                    {cd.derivType === 'spacing'      && `Along: ${cd.spacingTargetDim ?? 'length'} · ${cd.spacingMode === 'user' ? 'user input' : cd.spacing + ' ' + getDimUnit(cd.spacingTargetDim ?? 'length', sys?.dimOverrides)}`}
                    {cd.derivType === 'formula'      && `${cd.formulaQty} × ${cd.formulaDimKey}`}
                    {cd.derivType === 'sheet_cut'    && `Part: ${cd.partW}×${cd.partH}mm · kerf: ${cd.kerf}mm`}
                    {cd.derivType === 'sum'          && `Sum of: ${(cd.sumKeys ?? []).join(', ')}`}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="xs" variant={isEd ? 'primary' : 'ghost'}
                    onClick={() => isEd ? cancelEdit() : startEdit(cd)}
                    icon={<Edit3 className="w-3 h-3" />}>
                    {isEd ? 'Cancel' : 'Edit'}
                  </Button>
                  <Button size="xs" variant="danger" onClick={() => setDeleteId(cd.id)} icon={<Trash2 className="w-3 h-3" />} />
                </div>
              </div>
              {isEd && editDraft && (
                <div className="px-5 pb-5 border-t border-primary/20">
                  <div className="pt-4">
                    <DimForm d={editDraft} set={se} isEdit={true} precedingDims={derivedDims.slice(0, cdIdx)} />
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="primary" onClick={saveEdit} icon={<Check className="w-3.5 h-3.5" />}>Save</Button>
                      <Button size="sm" variant="secondary" onClick={cancelEdit} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <ConfirmModal
        open={deleteId !== null}
        title="Delete dimension?"
        message="Any material rules referencing this dimension will break."
        onConfirm={() => { remove(deleteId!); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
