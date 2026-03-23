// src/components/calculator/panels/CustomBracketsPanel.tsx
'use client'
import { useState } from 'react'
import { nanoid } from 'nanoid'
import { Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { IconPicker }  from '@/components/ui/IconPicker'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Input, NumberInput } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { WorkBracket, BracketParameter, BracketBOMItem, BracketFabActivity, Material } from '@/types'
import { evaluateFormula } from '@/lib/engine/work'
import { InlineRuleEditor } from './MatRow'
import type { CustomDim, CustomCriterion, Variant } from '@/types'

interface Props {
  customBrackets: WorkBracket[]
  materials:      Material[]
  libraryItems?:  any[]
  customDims:     CustomDim[]
  customCriteria: CustomCriterion[]
  variants:       Variant[]
  onChange:       (brackets: WorkBracket[]) => void
  onAddFromLib?:  (libItem: any) => void
}

const BLANK_BRACKET: Omit<WorkBracket, 'id'> = {
  name:          '',
  code:          '',
  description:   '',
  icon:          '🔩',
  color:         '#7c3aed',
  ruleSet:       [],
  criteriaKeys:  [],
  variantTags:   {},
  parameters:    [],
  bom:           [],
  fabActivities: [],
}

const QTY_UNITS = ['pcs', 'mm', 'm', 'kg', 'L', 'each']
const TIME_UNITS: ('min' | 'hr')[] = ['min', 'hr']

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
        <Input label="Qty formula" value={item.qtyFormula} onChange={e => onChange({ ...item, qtyFormula: e.target.value })}
          placeholder="e.g. 2 or projection_mm + 50" />
        {params.length > 0 && <div className="text-[10px] text-ink-faint mt-0.5">= {resolvedQty} (at defaults)</div>}
      </div>
      <Select label="Unit" value={item.qtyUnit} onChange={e => onChange({ ...item, qtyUnit: e.target.value })}
        options={QTY_UNITS.map(u => ({ value: u, label: u }))} className="w-20" />
      <Input label="Notes" value={item.notes ?? ''} onChange={e => onChange({ ...item, notes: e.target.value })}
        placeholder="Optional" className="w-40" />
      <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 mb-1 flex-shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

function FabActivityRow({
  item, params, onChange, onRemove,
}: {
  item: BracketFabActivity
  params: BracketParameter[]
  onChange: (item: BracketFabActivity) => void
  onRemove: () => void
}) {
  const resolvedTime = evaluateFormula(item.timeFormula, Object.fromEntries(params.map(p => [p.key, p.default])))
  return (
    <div className="flex flex-wrap gap-2 items-end bg-surface-50 border border-surface-200 p-3" style={{ borderRadius: 'var(--radius-card)' }}>
      <Input label="Activity name" value={item.name} onChange={e => onChange({ ...item, name: e.target.value })}
        placeholder="e.g. Cut angle iron" className="flex-1 min-w-40" />
      <div className="flex-1 min-w-32">
        <Input label="Time formula" value={item.timeFormula} onChange={e => onChange({ ...item, timeFormula: e.target.value })}
          placeholder="e.g. 5 or 3 + projection_mm / 100" />
        {params.length > 0 && <div className="text-[10px] text-ink-faint mt-0.5">= {resolvedTime.toFixed(1)} (at defaults)</div>}
      </div>
      <Select label="Unit" value={item.timeUnit} onChange={e => onChange({ ...item, timeUnit: e.target.value as 'min' | 'hr' })}
        options={TIME_UNITS.map(u => ({ value: u, label: u }))} className="w-20" />
      <Input label="Labour cat." value={item.labourCategory ?? ''} onChange={e => onChange({ ...item, labourCategory: e.target.value })}
        placeholder="Optional" className="w-36" />
      <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 mb-1 flex-shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

function BracketForm({
  draft, onChange, materials, libraryItems = [], customDims, customCriteria, variants, onSave, onCancel, label, onAddFromLib,
}: {
  draft: Partial<WorkBracket>
  onChange: (patch: Partial<WorkBracket>) => void
  materials: Material[]
  libraryItems?: any[]
  customDims: CustomDim[]
  customCriteria: CustomCriterion[]
  variants: Variant[]
  onSave: () => void
  onCancel: () => void
  label: string
  onAddFromLib?: (libItem: any) => void
}) {
  const params       = draft.parameters    ?? []
  const bom          = draft.bom           ?? []
  const fabActivities = draft.fabActivities ?? []

  const addParam = () => onChange({ parameters: [...params, { key: 'param_' + nanoid(4), label: 'Parameter', unit: 'mm', default: 0 }] })
  const updateParam = (i: number, p: BracketParameter) => onChange({ parameters: params.map((x, j) => j === i ? p : x) })
  const removeParam = (i: number) => onChange({ parameters: params.filter((_, j) => j !== i) })

  const addBOM = () => onChange({ bom: [...bom, { id: nanoid(), materialId: '', qtyFormula: '1', qtyUnit: 'pcs' }] })
  const updateBOM = (i: number, item: BracketBOMItem) => onChange({ bom: bom.map((x, j) => j === i ? item : x) })
  const removeBOM = (i: number) => onChange({ bom: bom.filter((_, j) => j !== i) })

  const addFab = () => onChange({ fabActivities: [...fabActivities, { id: nanoid(), name: '', timeFormula: '0', timeUnit: 'min' }] })
  const updateFab = (i: number, item: BracketFabActivity) => onChange({ fabActivities: fabActivities.map((x, j) => j === i ? item : x) })
  const removeFab = (i: number) => onChange({ fabActivities: fabActivities.filter((_, j) => j !== i) })

  const totalFabTime = fabActivities.reduce((sum, fa) => {
    const t = evaluateFormula(fa.timeFormula, Object.fromEntries(params.map(p => [p.key, p.default])))
    return sum + (fa.timeUnit === 'hr' ? t * 60 : t)
  }, 0)

  return (
    <div className="space-y-5">
      {/* Identity */}
      <div className="flex flex-wrap gap-3">
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

      {/* Qty rules */}
      <div>
        <label className="label mb-2 block">Quantity Rules</label>
        <div className="border border-surface-300 bg-surface-50 rounded-lg overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
        <InlineRuleEditor
          mat={{
            id: draft.id ?? 'bracket_draft',
            name: draft.name || 'Bracket',
            unit: 'bracket',
            ruleSet:      draft.ruleSet      ?? [],
            criteriaKeys: draft.criteriaKeys ?? [],
            variantTags:  draft.variantTags  ?? {},
            customDimKey: null,
            notes: '', photo: null, productCode: '', category: '',
            properties: {}, tags: [], substrate: 'all', libraryRef: null,
            _libSyncedAt: null, _systemSpecific: false, _createdInSystem: null,
            _createdAt: null, _updatedAt: null, _wasLibrary: null, _madeUniqueAt: null,
          } as Material}
          embedded
          hideDimOutput
          customDims={customDims}
          customCriteria={customCriteria}
          variants={variants}
          onSave={m => onChange({ ruleSet: m.ruleSet, criteriaKeys: m.criteriaKeys, variantTags: m.variantTags })}
          onClose={() => {}}
        />
        </div>
      </div>

      {/* Parameters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Parameters (optional)</label>
          <button type="button" onClick={addParam} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {params.length === 0 && <p className="text-xs text-ink-faint">No parameters — bracket quantities are fixed. Add parameters for adjustable assemblies (e.g. projection_mm).</p>}
        <div className="space-y-2">
          {params.map((p, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-end bg-surface-50 rounded-lg border border-surface-200 p-3">
              <Input label="Key" value={p.key} onChange={e => updateParam(i, { ...p, key: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
                placeholder="projection_mm" className="w-36" />
              <Input label="Label" value={p.label} onChange={e => updateParam(i, { ...p, label: e.target.value })}
                placeholder="Projection" className="w-36" />
              <Input label="Unit" value={p.unit} onChange={e => updateParam(i, { ...p, unit: e.target.value })}
                placeholder="mm" className="w-20" />
              <NumberInput label="Default" value={p.default} step="any" onChange={e => updateParam(i, { ...p, default: parseFloat(e.target.value) || 0 })} className="w-24" />
              <NumberInput label="Min" value={p.min ?? ''} step="any" onChange={e => updateParam(i, { ...p, min: parseFloat(e.target.value) || undefined })} className="w-20" />
              <NumberInput label="Max" value={p.max ?? ''} step="any" onChange={e => updateParam(i, { ...p, max: parseFloat(e.target.value) || undefined })} className="w-20" />
              <button type="button" onClick={() => removeParam(i)} className="text-red-400 hover:text-red-600 mb-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Bill of Materials */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Bill of Materials</label>
          <button type="button" onClick={addBOM} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
            <Plus className="w-3 h-3" /> Add material
          </button>
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

      {/* Fabrication Activities */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <label className="label mb-0">Fabrication Activities</label>
            {fabActivities.length > 0 && <span className="text-xs text-ink-faint ml-2">Total: {totalFabTime.toFixed(1)} min/bracket</span>}
          </div>
          <button type="button" onClick={addFab} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
            <Plus className="w-3 h-3" /> Add activity
          </button>
        </div>
        {fabActivities.length === 0 && <p className="text-xs text-ink-faint">No fab activities. Add workshop steps like cutting, drilling, welding.</p>}
        <div className="space-y-2">
          {fabActivities.map((item, i) => (
            <FabActivityRow key={item.id} item={item} params={params}
              onChange={updated => updateFab(i, updated)} onRemove={() => removeFab(i)} />
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

export default function CustomBracketsPanel({ customBrackets, materials, libraryItems = [], customDims, customCriteria, variants, onChange, onAddFromLib }: Props) {
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
    <div className="border border-secondary-200 bg-surface-50 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'var(--color-secondary-100)', borderColor: 'var(--color-secondary-200)' }}>
        <div>
          <h3 className="font-semibold text-sm text-secondary-700">🔩 Custom Brackets</h3>
          <p className="text-xs text-secondary-600 mt-0.5">Composite assemblies with bill of materials and fabrication activities.</p>
        </div>
        <Button size="sm" onClick={() => { setAdding(v => !v); setEditingId(null) }} icon={<Plus className="w-3.5 h-3.5" />} className="!border-secondary-200 !text-secondary-700">Add Bracket</Button>
      </div>

      {adding && (
        <div className="p-5 bg-surface-100 border-b border-secondary-200">
          <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-4">New Bracket</div>
          <BracketForm draft={draft} onChange={patch => setDraft(d => ({ ...d, ...patch }))}
            materials={materials} libraryItems={libraryItems} customDims={customDims} customCriteria={customCriteria} variants={variants}
            onSave={add} onCancel={() => setAdding(false)} label="Add" onAddFromLib={onAddFromLib} />
        </div>
      )}

      {customBrackets.length === 0 && !adding && (
        <div className="py-10 text-center text-sm text-ink-faint">
          No custom brackets defined. Example: "Wall Bracket Type A" made of angle iron, bolts, and washers.
        </div>
      )}

      <div className="divide-y divide-secondary-200" key="list">
        {customBrackets.map(bracket => {
          const isEd  = editingId === bracket.id
          const isExp = expandedId === bracket.id && !isEd
          const totalFabMin = (bracket.fabActivities ?? []).reduce((sum, fa) => {
            const t = evaluateFormula(fa.timeFormula, {})
            return sum + (fa.timeUnit === 'hr' ? t * 60 : t)
          }, 0)
          return (
            <div key={bracket.id} className={isEd ? 'bg-primary/5' : ''}>
              <div className="px-5 py-3 flex items-start gap-3">
                <span className="text-lg flex-shrink-0 mt-0.5">{bracket.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-ink">{bracket.name}</span>
                    {bracket.code && <span className="font-mono text-xs text-ink-faint">{bracket.code}</span>}
                    {(bracket.parameters ?? []).length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-secondary-700" style={{ background: 'var(--color-secondary-100)' }}>parametric</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-ink-muted flex-wrap">
                    <span>{(bracket.bom ?? []).length} BOM items</span>
                    {totalFabMin > 0 && <span>{totalFabMin.toFixed(0)} min fab</span>}
                    {(bracket.ruleSet?.some(r => r.ruleType)) ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-primary" style={{ background: 'var(--color-primary-50, #eff6ff)' }}>rule-driven qty</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-amber-700 bg-amber-50">⚠ no qty rule</span>
                    )}
                    {bracket.description && <span className="text-ink-faint">{bracket.description}</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button type="button" onClick={() => setExpandedId(isExp ? null : bracket.id)}
                    className="text-ink-faint hover:text-ink p-1">
                    {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
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
                        {bracket.parameters.map(p => (
                          <span key={p.key} className="text-xs border px-2 py-0.5 font-mono text-secondary-700 border-secondary-200" style={{ borderRadius: 'var(--radius)', background: 'var(--color-secondary-50)' }}>
                            {p.key} = {p.default}{p.unit}
                          </span>
                        ))}
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
                          const qty = evaluateFormula(item.qtyFormula, Object.fromEntries((bracket.parameters ?? []).map(p => [p.key, p.default])))
                          return (
                            <div key={item.id} className="flex items-center gap-2 text-xs text-ink">
                              <span className="text-ink-faint w-3">└</span>
                              <span className="font-medium">{matName}</span>
                              {item.customName && <span className="text-[9px] text-ink-faint border border-surface-300 px-1 rounded">custom</span>}
                              <span className="text-ink-muted font-mono">{qty} {item.qtyUnit}</span>
                              {item.notes && <span className="text-ink-faint">{item.notes}</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {(bracket.fabActivities ?? []).length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase text-ink-faint tracking-wide mb-1">Fabrication</div>
                      <div className="space-y-0.5">
                        {bracket.fabActivities.map(fa => {
                          const t = evaluateFormula(fa.timeFormula, Object.fromEntries((bracket.parameters ?? []).map(p => [p.key, p.default])))
                          return (
                            <div key={fa.id} className="flex items-center gap-2 text-xs text-ink">
                              <span className="text-ink-faint w-3">└</span>
                              <span className="font-medium">{fa.name}</span>
                              <span className="text-ink-muted font-mono">{t.toFixed(1)} {fa.timeUnit}</span>
                              {fa.labourCategory && <span className="text-ink-faint">{fa.labourCategory}</span>}
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
                    materials={materials} libraryItems={libraryItems} customDims={customDims} customCriteria={customCriteria} variants={variants}
                    onSave={saveEdit} onCancel={cancelEdit} label="Save" onAddFromLib={onAddFromLib} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <ConfirmModal
        open={deleteId !== null}
        title="Delete bracket?"
        message="This custom bracket and all its BOM items and fabrication activities will be permanently removed."
        onConfirm={() => { remove(deleteId!); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
