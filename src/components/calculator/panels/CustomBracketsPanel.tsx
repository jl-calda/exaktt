// src/components/calculator/panels/CustomBracketsPanel.tsx
'use client'
import { useState, useRef, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { IconPicker }  from '@/components/ui/IconPicker'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { WorkBracket, BracketParameter, BracketBOMItem, BracketWorkActivityRef, WorkActivityRate, Material } from '@/types'
import { evaluateFormula } from '@/lib/engine/work'

interface Props {
  customBrackets:    WorkBracket[]
  materials:         Material[]
  libraryItems?:     any[]
  labourRates?:      any[]
  workActivityRates?: WorkActivityRate[]
  setupBracketIds?:  Set<string>   // IDs of brackets currently in setup (for deletion warning)
  onChange:          (brackets: WorkBracket[]) => void
  onAddFromLib?:     (libItem: any) => void
}

const BLANK_BRACKET: Omit<WorkBracket, 'id'> = {
  name:          '',
  code:          '',
  description:   '',
  icon:          '🔩',
  color:         '#7c3aed',
  parameters:    [],
  bom:           [],
  workActivityRefs: [],
}

const QTY_UNITS = ['pcs', 'mm', 'm', 'kg', 'L', 'each']

const PARAM_UNITS = [
  { value: 'mm', label: 'mm' },
  { value: 'cm', label: 'cm' },
  { value: 'm', label: 'm' },
  { value: 'pcs', label: 'pcs' },
  { value: 'kg', label: 'kg' },
  { value: 'L', label: 'L' },
  { value: 'deg', label: 'deg' },
]
const TIME_UNITS: ('min' | 'hr')[] = ['min', 'hr']

/* ── Formula input with parameter key autocomplete ── */
function FormulaInput({
  label, value, onChange, placeholder, params,
}: {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  params: BracketParameter[]
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [selIdx, setSelIdx] = useState(0)

  // Extract the "word" fragment at the cursor (letters/digits/underscores after an operator or start)
  const getFragment = useCallback(() => {
    const el = inputRef.current
    if (!el) return { fragment: '', start: 0, end: 0 }
    const pos = el.selectionStart ?? value.length
    // walk backwards from cursor to find start of current token
    let start = pos
    while (start > 0 && /[\w]/.test(value[start - 1])) start--
    const fragment = value.slice(start, pos)
    return { fragment, start, end: pos }
  }, [value])

  const getMatches = useCallback(() => {
    const { fragment } = getFragment()
    if (!fragment || /^\d+$/.test(fragment)) return [] // don't suggest for pure numbers
    return params.filter(p => p.key.toLowerCase().includes(fragment.toLowerCase()))
  }, [getFragment, params])

  const insertKey = useCallback((key: string) => {
    const { start, end } = getFragment()
    const before = value.slice(0, start)
    const after = value.slice(end)
    const newVal = before + key + after
    onChange(newVal)
    setOpen(false)
    // restore cursor after the inserted key
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (el) {
        const cursor = start + key.length
        el.setSelectionRange(cursor, cursor)
        el.focus()
      }
    })
  }, [getFragment, value, onChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const matches = getMatches()
    if (!open || matches.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelIdx(i => (i + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelIdx(i => (i - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertKey(matches[selIdx].key)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setSelIdx(0)
    // open dropdown if there's a non-numeric fragment
    requestAnimationFrame(() => {
      const matches = params.filter(p => {
        const el = inputRef.current
        if (!el) return false
        const pos = el.selectionStart ?? e.target.value.length
        let s = pos
        while (s > 0 && /[\w]/.test(e.target.value[s - 1])) s--
        const frag = e.target.value.slice(s, pos)
        return frag && !/^\d+$/.test(frag) && p.key.toLowerCase().includes(frag.toLowerCase())
      })
      setOpen(matches.length > 0)
    })
  }

  const matches = getMatches()

  return (
    <div className="relative flex flex-col gap-1">
      <label className="label">{label}</label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => { const m = getMatches(); setOpen(m.length > 0) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="input"
      />
      {open && matches.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface border border-surface-200 rounded shadow-lg max-h-32 overflow-y-auto">
          {matches.map((p, i) => (
            <button
              key={p.key}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-100 ${i === selIdx ? 'bg-surface-100' : ''}`}
              onMouseDown={e => { e.preventDefault(); insertKey(p.key) }}
            >
              <span className="font-mono font-medium text-primary">{p.key}</span>
              <span className="text-ink-faint ml-2">{p.label}{p.unit ? ` (${p.unit})` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BOMItemRow({
  item, params, materials, libraryItems = [], onChange, onRemove, onAddFromLib,
}: {
  item: BracketBOMItem
  params: BracketParameter[]
  materials: Material[]
  libraryItems?: any[]
  onChange: (item: BracketBOMItem) => void
  onRemove: () => void
  onAddFromLib?: (libItem: any) => void
}) {
  const useCustom = item.customName !== undefined
  const resolvedQty = evaluateFormula(item.qtyFormula, Object.fromEntries(params.map(p => [p.key, p.default])))

  const toggleMode = () => {
    if (useCustom) {
      onChange({ ...item, customName: undefined, materialId: '' })
    } else {
      onChange({ ...item, customName: '', materialId: '' })
    }
  }

  // Build grouped options: system materials + library items not yet in system
  const sysMaterialIds = new Set(materials.map(m => m.id))
  const libRefIds = new Set(materials.map(m => m.libraryRef).filter(Boolean))
  const availableLib = libraryItems.filter(l => !libRefIds.has(l.id))

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val.startsWith('lib:') && onAddFromLib) {
      const libId = val.slice(4)
      const libItem = libraryItems.find(l => l.id === libId)
      if (libItem) onAddFromLib(libItem)
      // materialId will be set after the parent re-renders with the new material
    } else {
      onChange({ ...item, materialId: val })
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-end bg-surface-50 border border-surface-200 p-3" style={{ borderRadius: 'var(--radius-card)' }}>
      <div className="flex flex-col gap-1 flex-1 min-w-40">
        <div className="flex items-center justify-between">
          <span className="label mb-0">Material</span>
          <button type="button" onClick={toggleMode}
            className="text-[10px] text-primary hover:underline font-medium">
            {useCustom ? 'Pick from system' : 'Enter custom name'}
          </button>
        </div>
        {useCustom
          ? <input type="text" value={item.customName ?? ''} onChange={e => onChange({ ...item, customName: e.target.value })}
              placeholder="e.g. M12 bolt, angle iron…" className="input text-sm" />
          : <select value={item.materialId} onChange={handleSelect} className="input text-sm">
              <option value="">— pick material —</option>
              {materials.length > 0 && (
                <optgroup label="System Materials">
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name}{m.productCode ? ` (${m.productCode})` : ''}</option>
                  ))}
                </optgroup>
              )}
              {availableLib.length > 0 && (
                <optgroup label="Library — click to add to system">
                  {availableLib.map(l => (
                    <option key={`lib:${l.id}`} value={`lib:${l.id}`}>+ {l.name}{l.productCode ? ` (${l.productCode})` : ''}</option>
                  ))}
                </optgroup>
              )}
            </select>
        }
      </div>
      <div className="flex-1 min-w-32">
        <FormulaInput label="Qty formula" value={item.qtyFormula} onChange={val => onChange({ ...item, qtyFormula: val })}
          placeholder="e.g. 2 or projection_mm + 50" params={params} />
        {params.length > 0 && <div className="text-[10px] text-ink-faint mt-0.5">= {resolvedQty} (at defaults)</div>}
      </div>
      <Select label="Unit" value={item.qtyUnit} onChange={e => onChange({ ...item, qtyUnit: e.target.value })}
        options={QTY_UNITS.map(u => ({ value: u, label: u }))} className="w-20" />
      <Input label="Notes" value={item.notes ?? ''} onChange={e => onChange({ ...item, notes: e.target.value })}
        placeholder="Optional" className="w-40" />
      <Button size="xs" variant="danger" onClick={onRemove} icon={<Trash2 className="w-3 h-3" />} className="mb-1 flex-shrink-0" />
    </div>
  )
}

function WorkActivityRefRow({
  item, params, onChange, onRemove, workActivityRates = [],
}: {
  item: BracketWorkActivityRef
  params: BracketParameter[]
  onChange: (item: BracketWorkActivityRef) => void
  onRemove: () => void
  workActivityRates?: WorkActivityRate[]
}) {
  const resolvedTime = evaluateFormula(item.timeFormula, Object.fromEntries(params.map(p => [p.key, p.default])))

  const onWarChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const warId = e.target.value
    if (!warId) {
      onChange({ ...item, workActivityRateId: '', _categoryName: '', _categoryIcon: '', _rateName: '', _rateValue: 0, _rateUnitType: 'per_hour', _rateUnitLabel: 'hr', _labourRateHr: undefined, _unitCost: undefined })
    } else {
      const war = workActivityRates.find(w => w.id === warId)
      if (war) {
        onChange({
          ...item,
          workActivityRateId: war.id,
          _categoryName:  war.categoryName,
          _categoryIcon:  war.categoryIcon,
          _rateName:      war.rateName,
          _rateValue:     war.rateValue,
          _rateUnitType:  war.rateUnitType,
          _rateUnitLabel: war.rateUnitLabel,
          _labourRateHr:  war.rateUnitType === 'per_hour' ? war.rateValue : undefined,
          _unitCost:      war.rateUnitType !== 'per_hour' ? war.rateValue : undefined,
          crewSize:       war.crewSize,
        })
      }
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-end bg-surface-50 border border-surface-200 p-3" style={{ borderRadius: 'var(--radius-card)' }}>
      <div className="w-52">
        <label className="label">Activity Rate</label>
        <select className="input text-xs" value={item.workActivityRateId ?? ''} onChange={onWarChange}>
          <option value="">— pick activity rate —</option>
          {workActivityRates.map(w => (
            <option key={w.id} value={w.id}>{w.categoryIcon} {w.name} ({w.rateValue}/{w.rateUnitLabel})</option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-32">
        <FormulaInput label="Time formula" value={item.timeFormula} onChange={val => onChange({ ...item, timeFormula: val })}
          placeholder="e.g. 5 or 3 + projection_mm / 100" params={params} />
        {params.length > 0 && <div className="text-[10px] text-ink-faint mt-0.5">= {resolvedTime.toFixed(1)} (at defaults)</div>}
      </div>
      <Select label="Unit" value={item.timeUnit} onChange={e => onChange({ ...item, timeUnit: e.target.value as 'min' | 'hr' })}
        options={TIME_UNITS.map(u => ({ value: u, label: u }))} className="w-20" />
      {item._categoryName && (
        <div className="text-xs text-ink-muted self-end pb-2">
          {item._categoryIcon} {item._categoryName} — {item._rateValue}/{item._rateUnitLabel}
        </div>
      )}
      <Button size="xs" variant="danger" onClick={onRemove} icon={<Trash2 className="w-3 h-3" />} className="mb-1 flex-shrink-0" />
    </div>
  )
}

function BracketForm({
  draft, onChange, materials, libraryItems = [], workActivityRates = [], onSave, onCancel, label, onAddFromLib,
}: {
  draft: Partial<WorkBracket>
  onChange: (patch: Partial<WorkBracket>) => void
  materials: Material[]
  libraryItems?: any[]
  workActivityRates?: WorkActivityRate[]
  onSave: () => void
  onCancel: () => void
  label: string
  onAddFromLib?: (libItem: any) => void
}) {
  const params           = draft.parameters       ?? []
  const bom              = draft.bom              ?? []
  const workActivityRefs = draft.workActivityRefs ?? []

  const addParam = () => onChange({ parameters: [...params, { key: 'param_' + nanoid(4), label: 'Parameter', unit: 'mm', default: 0 }] })
  const updateParam = (i: number, p: BracketParameter) => onChange({ parameters: params.map((x, j) => j === i ? p : x) })
  const removeParam = (i: number) => onChange({ parameters: params.filter((_, j) => j !== i) })

  const addBOM = () => onChange({ bom: [...bom, { id: nanoid(), materialId: '', qtyFormula: '1', qtyUnit: 'pcs' }] })
  const updateBOM = (i: number, item: BracketBOMItem) => onChange({ bom: bom.map((x, j) => j === i ? item : x) })
  const removeBOM = (i: number) => onChange({ bom: bom.filter((_, j) => j !== i) })

  const addRef = () => onChange({ workActivityRefs: [...workActivityRefs, { id: nanoid(), workActivityRateId: '', timeFormula: '0', timeUnit: 'min', _categoryName: '', _categoryIcon: '', _rateName: '', _rateValue: 0, _rateUnitType: 'per_hour', _rateUnitLabel: 'hr' }] })
  const updateRef = (i: number, item: BracketWorkActivityRef) => onChange({ workActivityRefs: workActivityRefs.map((x, j) => j === i ? item : x) })
  const removeRef = (i: number) => onChange({ workActivityRefs: workActivityRefs.filter((_, j) => j !== i) })

  const totalFabTime = workActivityRefs.reduce((sum, ref) => {
    const t = evaluateFormula(ref.timeFormula, Object.fromEntries(params.map(p => [p.key, p.default])))
    return sum + (ref.timeUnit === 'hr' ? t * 60 : t)
  }, 0)

  return (
    <div className="space-y-5">
      {/* Identity */}
      <div className="flex flex-wrap gap-4 items-start">
        <div className="flex gap-2">
          <div>
            <IconPicker  label="Icon"   value={draft.icon  ?? '🔩'}     onChange={v => onChange({ icon: v })} />
          </div>
          <div>
            <ColorPicker label="Colour" value={draft.color ?? '#7c3aed'} onChange={v => onChange({ color: v })} />
          </div>
        </div>
        <Input label="Name" value={draft.name ?? ''} onChange={e => onChange({ name: e.target.value })}
          placeholder="e.g. Wall Bracket Type A" className="flex-1 min-w-48" />
        <Input label="Code" value={draft.code ?? ''} onChange={e => onChange({ code: e.target.value })}
          placeholder="WB-A" className="w-28" />
        <Input label="Description" value={draft.description ?? ''} onChange={e => onChange({ description: e.target.value })}
          placeholder="Optional" className="flex-1 min-w-48" />
      </div>

      {/* Parameters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Parameters</label>
          <Button size="xs" variant="secondary" onClick={addParam} icon={<Plus className="w-3 h-3" />}>Add</Button>
        </div>
        {params.length === 0 && <p className="text-xs text-ink-faint">No parameters — bracket quantities are fixed. Add parameters for adjustable assemblies (e.g. length).</p>}
        <div className="space-y-2">
          {params.map((p, i) => (
              <div key={i} className="bg-surface-50 rounded-lg border border-surface-200 p-3">
                <div className="flex flex-wrap gap-2 items-end">
                  <Input label="Key" value={p.key} onChange={e => updateParam(i, { ...p, key: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
                    placeholder="length" className="w-36" />
                  <Input label="Label" value={p.label} onChange={e => updateParam(i, { ...p, label: e.target.value })}
                    placeholder="Length" className="w-36" />
                  <Select label="Unit" value={p.unit} onChange={e => updateParam(i, { ...p, unit: e.target.value })}
                    options={PARAM_UNITS} className="w-20" />
                  <Button size="xs" variant="danger" onClick={() => removeParam(i)} icon={<Trash2 className="w-3 h-3" />} className="mb-1" />
                </div>
              </div>
          ))}
        </div>
      </div>

      {/* Bill of Materials */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Bill of Materials</label>
          <Button size="xs" variant="secondary" onClick={addBOM} icon={<Plus className="w-3 h-3" />}>Add material</Button>
        </div>
        {bom.length === 0 && <p className="text-xs text-ink-faint">No BOM items. Add raw materials that make up this bracket.</p>}
        <div className="space-y-2">
          {bom.map((item, i) => (
            <BOMItemRow key={item.id} item={item} params={params} materials={materials}
              libraryItems={libraryItems} onAddFromLib={onAddFromLib}
              onChange={updated => updateBOM(i, updated)} onRemove={() => removeBOM(i)} />
          ))}
        </div>
      </div>

      {/* Work Activity Rates */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <label className="label mb-0">Work Activities</label>
            {workActivityRefs.length > 0 && <span className="text-xs text-ink-faint ml-2">Total: {totalFabTime.toFixed(1)} min/bracket</span>}
          </div>
          <Button size="xs" variant="secondary" onClick={addRef} icon={<Plus className="w-3 h-3" />}>Add activity</Button>
        </div>
        {workActivityRefs.length === 0 && <p className="text-xs text-ink-faint">No work activities. Add workshop steps like cutting, drilling, welding.</p>}
        <div className="space-y-2">
          {workActivityRefs.map((item, i) => (
            <WorkActivityRefRow key={item.id} item={item} params={params} workActivityRates={workActivityRates}
              onChange={updated => updateRef(i, updated)} onRemove={() => removeRef(i)} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="primary" onClick={onSave} icon={<Check className="w-3.5 h-3.5" />}>{label}</Button>
        <Button size="sm" variant="secondary" onClick={onCancel} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
      </div>
    </div>
  )
}

export default function CustomBracketsPanel({ customBrackets, materials, libraryItems = [], labourRates = [], workActivityRates = [], setupBracketIds, onChange, onAddFromLib }: Props) {
  const [adding,    setAdding]    = useState(false)
  const [draft,     setDraft]     = useState<Omit<WorkBracket, 'id'>>({ ...BLANK_BRACKET })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<WorkBracket | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  const add = () => {
    if (!draft.name.trim()) return
    onChange([...customBrackets, { ...draft, id: nanoid() }])
    setDraft({ ...BLANK_BRACKET }); setAdding(false)
  }

  const remove     = (id: string) => onChange(customBrackets.filter(b => b.id !== id))
  const startEdit  = (b: WorkBracket) => { setEditingId(b.id); setEditDraft({ ...b }); setAdding(false); setExpandedId(null) }
  const cancelEdit = () => { setEditingId(null); setEditDraft(null) }
  const saveEdit   = () => {
    if (!editDraft?.name.trim()) return
    onChange(customBrackets.map(b => b.id === editingId ? { ...editDraft } : b))
    cancelEdit()
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div>
          <h3 className="font-semibold text-sm text-ink">🔩 Sub-assemblies</h3>
          <p className="text-xs text-ink-muted mt-0.5">Composite assemblies with bill of materials and fabrication activities.</p>
        </div>
        <Button size="sm" onClick={() => { setAdding(v => !v); setEditingId(null) }} icon={<Plus className="w-3.5 h-3.5" />}>Add Bracket</Button>
      </div>

      {adding && (
        <div className="p-5 bg-surface-100 border-b border-surface-200">
          <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-4">New Bracket</div>
          <BracketForm draft={draft} onChange={patch => setDraft(d => ({ ...d, ...patch }))}
            materials={materials} libraryItems={libraryItems} workActivityRates={workActivityRates}
            onSave={add} onCancel={() => setAdding(false)} label="Add" onAddFromLib={onAddFromLib} />
        </div>
      )}

      {customBrackets.length === 0 && !adding && (
        <div className="py-10 text-center text-sm text-ink-faint">
          No sub-assemblies defined. Example: "Wall Bracket Type A" made of angle iron, bolts, and washers.
        </div>
      )}

      <div className="divide-y divide-surface-200/40" key="list">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface-100 border-b border-surface-200 text-left">
              <th className="px-3 py-2.5 w-14"></th>
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-ink-faint min-w-52">Sub-assembly</th>
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-ink-faint w-24 text-center">BOM</th>
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-ink-faint">Info</th>
              <th className="px-3 py-2.5 w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
        {customBrackets.map(bracket => {
          const isEd  = editingId === bracket.id
          const isExp = expandedId === bracket.id && !isEd
          const totalFabMin = (bracket.workActivityRefs ?? []).reduce((sum, ref) => {
            const t = evaluateFormula(ref.timeFormula, {})
            return sum + (ref.timeUnit === 'hr' ? t * 60 : t)
          }, 0)
          return (
            <tr key={bracket.id} className={isEd ? 'bg-primary/5' : 'hover:bg-surface-100/50 transition-colors'}>
              <td colSpan={5} className="p-0">
              <div className={isEd ? 'bg-primary/5' : ''}>
              <div className="px-5 py-3 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-surface-200/40 flex items-center justify-center text-base flex-shrink-0">{bracket.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-ink">{bracket.name}</span>
                    {bracket.code && <code className="text-[10px] bg-surface-100 text-ink-muted px-1.5 py-0.5 rounded font-mono">{bracket.code}</code>}
                    {(bracket.parameters ?? []).length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-purple-700 bg-purple-50">parametric</span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-surface-100 text-ink-muted">
                      {(bracket.bom ?? []).length} BOM
                    </span>
                    {totalFabMin > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-50 text-amber-700">
                        {totalFabMin.toFixed(0)} min fab
                      </span>
                    )}
                  </div>
                  {bracket.description && (
                    <p className="text-xs text-ink-faint mt-0.5 italic truncate max-w-md">{bracket.description}</p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="xs" variant="ghost" onClick={() => setExpandedId(isExp ? null : bracket.id)}
                    icon={isExp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} />
                  <Button size="xs" variant={isEd ? 'primary' : 'ghost'} onClick={() => isEd ? cancelEdit() : startEdit(bracket)} icon={<Edit3 className="w-3 h-3" />}>
                    {isEd ? 'Cancel' : 'Edit'}
                  </Button>
                  <Button size="xs" variant="danger" onClick={() => setDeleteId(bracket.id)} icon={<Trash2 className="w-3 h-3" />} />
                </div>
              </div>

              {/* Expanded BOM preview */}
              {isExp && (
                <div className="px-5 pb-4 border-t border-surface-200 pt-3 bg-surface-50">
                  {(bracket.parameters ?? []).length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-bold uppercase text-ink-faint tracking-wide mb-1">Parameters</div>
                      <div className="flex flex-wrap gap-2">
                        {bracket.parameters.map(p => {
                          const isStock = p.source === 'stock_length'
                          const stockMat = isStock && p.stockMaterialId ? materials.find(m => m.id === p.stockMaterialId) : null
                          const stockVal = stockMat?.spec?.stockLengthMm ?? 0
                          const displayVal = isStock ? stockVal : p.default
                          return (
                            <span key={p.key} className="text-xs border px-2 py-0.5 font-mono text-ink border-surface-200" style={{ borderRadius: 'var(--radius)', background: 'var(--color-surface-100)' }}>
                              {p.key} = {displayVal}{p.unit}
                              {isStock && <span className="text-[9px] ml-1 text-primary font-sans font-semibold">(stock)</span>}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {(bracket.bom ?? []).length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-bold uppercase text-ink-faint tracking-wide mb-1">Bill of Materials</div>
                      <div className="space-y-0.5">
                        {bracket.bom.map(item => {
                          const mat     = materials.find(m => m.id === item.materialId)
                          const matName = item.customName || mat?.name || '(unknown)'
                          // Resolve params with stock length values
                          const resolvedParams: Record<string, number> = {}
                          for (const p of bracket.parameters ?? []) {
                            if (p.source === 'stock_length' && p.stockMaterialId) {
                              const sMat = materials.find(m => m.id === p.stockMaterialId)
                              resolvedParams[p.key] = sMat?.spec?.stockLengthMm ?? p.default
                            } else {
                              resolvedParams[p.key] = p.default
                            }
                          }
                          const qty = evaluateFormula(item.qtyFormula, resolvedParams)
                          // Show wastage hint if length-based BOM item with stock length available
                          const isLength = item.qtyUnit === 'mm' || item.qtyUnit === 'm'
                          const stockMm = mat?.spec?.stockLengthMm ?? 0
                          let wasteHint = ''
                          if (isLength && stockMm > 0) {
                            const cutMm = item.qtyUnit === 'm' ? qty * 1000 : qty
                            if (cutMm > 0 && cutMm <= stockMm) {
                              const pcsPerBar = Math.floor(stockMm / cutMm)
                              const offcut = stockMm - pcsPerBar * cutMm
                              const pct = (offcut / (pcsPerBar * cutMm)) * 100
                              wasteHint = pct > 0 ? `${pcsPerBar}/bar, ${pct.toFixed(1)}% waste` : `${pcsPerBar}/bar, 0% waste`
                            }
                          }
                          return (
                            <div key={item.id} className="flex items-center gap-2 text-xs text-ink">
                              <span className="text-ink-faint w-3">└</span>
                              <span className="font-medium">{matName}</span>
                              {item.customName && <span className="text-[9px] text-ink-faint border border-surface-300 px-1 rounded">custom</span>}
                              <span className="text-ink-muted font-mono">{qty} {item.qtyUnit}</span>
                              {wasteHint && <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">{wasteHint}</span>}
                              {item.notes && <span className="text-ink-faint">{item.notes}</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {(bracket.workActivityRefs ?? []).length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase text-ink-faint tracking-wide mb-1">Work Activities</div>
                      <div className="space-y-0.5">
                        {bracket.workActivityRefs.map(ref => {
                          const t = evaluateFormula(ref.timeFormula, Object.fromEntries((bracket.parameters ?? []).map(p => [p.key, p.default])))
                          return (
                            <div key={ref.id} className="flex items-center gap-2 text-xs text-ink">
                              <span className="text-ink-faint w-3">└</span>
                              <span className="font-medium">{ref._categoryIcon} {ref._categoryName || 'Activity'}</span>
                              <span className="text-ink-muted font-mono">{t.toFixed(1)} {ref.timeUnit}</span>
                              {ref._rateName && <span className="text-ink-faint">{ref._rateName} ({ref._rateValue}/{ref._rateUnitLabel})</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isEd && editDraft && (
                <div className="px-5 pb-5 border-t border-primary/20 pt-4">
                  <BracketForm draft={editDraft} onChange={patch => setEditDraft(d => d ? { ...d, ...patch } : d)}
                    materials={materials} libraryItems={libraryItems} workActivityRates={workActivityRates}
                    onSave={saveEdit} onCancel={cancelEdit} label="Save" onAddFromLib={onAddFromLib} />
                </div>
              )}
            </div>
            </td>
            </tr>
          )
        })}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        open={deleteId !== null}
        title="Delete bracket?"
        message={
          deleteId && setupBracketIds?.has(deleteId)
            ? "This sub-assembly is currently used in setup. Deleting it will remove it everywhere — including its quantity rules and parameter values."
            : "This custom bracket and all its BOM items and fabrication activities will be permanently removed."
        }
        onConfirm={() => { remove(deleteId!); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
