// src/components/calculator/panels/CriteriaPanel.tsx
'use client'
import { useState } from 'react'
import type { CustomCriterion, CustomDim } from '@/types'
import { PRIMITIVE_DIMS, DIMS_FOR_INPUT_MODEL, getDimUnit } from '@/lib/engine/constants'
import type { DimOverride } from '@/lib/engine/constants'
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
  customCriteria: CustomCriterion[]
  customDims:     CustomDim[]
  inputModel?:    string
  dimOverrides?:  Record<string, DimOverride>
  onChange:       (criteria: CustomCriterion[]) => void
}

const OPS  = [{ value: '>', label: '>' }, { value: '>=', label: '≥' }, { value: '<', label: '<' }, { value: '<=', label: '≤' }]
const BLANK = { name: '', description: '', icon: '🏷️', color: '#0891b2', type: 'input' as const, dimKey: 'corners', operator: '>' as const, threshold: 0 }

const CRITERIA_HELP: Record<string, { title: string; formula: string; example: string }> = {
  input: {
    title: 'User toggle',
    formula: 'shown as a checkbox in the calculator',
    example: '"Stainless upgrade" — user ticks to include stainless materials',
  },
  derived: {
    title: 'Auto-derived condition',
    formula: 'active when: dimension operator threshold',
    example: 'corners > 4 → enables corner-post materials automatically',
  },
}

const CRITERIA_FIELD_ITEMS: Record<string, { label: string; desc: string }[]> = {
  input: [
    { label: 'Name', desc: 'Label shown as the toggle in the calculator.' },
    { label: 'Description', desc: 'Short hint displayed below the toggle.' },
  ],
  derived: [
    { label: 'Dimension', desc: 'The input or custom dim whose value is evaluated.' },
    { label: 'Operator', desc: 'Comparison applied — e.g. > means "greater than".' },
    { label: 'Threshold', desc: 'The value the dimension is compared against to activate this criterion.' },
  ],
}

function FieldGuide({ type, items }: { type: string; items: { label: string; desc: string }[] }) {
  const h = CRITERIA_HELP[type]
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

export default function CriteriaPanel({ customCriteria, customDims, inputModel, dimOverrides, onChange }: Props) {
  const [adding, setAdding]       = useState(false)
  const [draft, setDraft]         = useState({ ...BLANK })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<CustomCriterion | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  const allowedKeys = new Set(DIMS_FOR_INPUT_MODEL[inputModel ?? ''] ?? PRIMITIVE_DIMS.map(p => p.key))
  const filteredPrims = PRIMITIVE_DIMS.filter(p => allowedKeys.has(p.key))
  const allDims = [...filteredPrims, ...customDims]
  const sd = (k: keyof typeof BLANK)       => (v: any) => setDraft(d => ({ ...d, [k]: v }))
  const se = (k: keyof CustomCriterion)    => (v: any) => setEditDraft(d => d ? { ...d, [k]: v } : d)

  const add = () => {
    if (!draft.name.trim()) return
    const key = draft.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).slice(2, 5)
    onChange([...customCriteria, { ...draft, id: nanoid(), key }])
    setDraft({ ...BLANK }); setAdding(false)
  }

  const remove     = (id: string) => onChange(customCriteria.filter(c => c.id !== id))
  const startEdit  = (cr: CustomCriterion) => { setEditingId(cr.id); setEditDraft({ ...cr }); setAdding(false) }
  const cancelEdit = () => { setEditingId(null); setEditDraft(null) }
  const saveEdit   = () => {
    if (!editDraft?.name.trim()) return
    onChange(customCriteria.map(c => c.id === editingId ? { ...editDraft } : c))
    cancelEdit()
  }

  const CriterionForm = ({ d, set, onSave, onCancel }: {
    d: typeof BLANK | CustomCriterion
    set: (k: any) => (v: any) => void
    onSave: () => void
    onCancel: () => void
  }) => {
    const dimKey = (d as any).dimKey ?? 'corners'
    const customDim = customDims.find(cd => cd.key === dimKey)
    const resolvedUnit = customDim ? customDim.unit : getDimUnit(dimKey, dimOverrides)
    const [guideOpen, setGuideOpen] = useState(false)
    const guideItems = CRITERIA_FIELD_ITEMS[d.type] ?? []
    return (
    <div className="space-y-3">
      {/* Fields */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Row 1: identity */}
        <div className="flex flex-wrap gap-4 items-start">
          <Input label="Name" value={d.name} onChange={e => set('name')(e.target.value)} placeholder='"Stainless upgrade"' className="w-48" />
          <Input label="Description" value={(d as any).description ?? ''} onChange={e => set('description')(e.target.value)} placeholder="Short explanation" className="w-56" />
          <IconPicker label="Icon" value={d.icon} onChange={v => set('icon')(v)} />
          <ColorPicker label="Colour" value={d.color} onChange={v => set('color')(v)} />
        </div>
        {/* Row 2: type + derived fields */}
        <div className="flex flex-wrap gap-4 items-start">
          <div className="flex flex-col gap-1">
            <label className="label">Type</label>
            <div className="flex overflow-hidden border border-surface-300" style={{ borderRadius: 'var(--radius)' }}>
              {[{ val: 'input', l: 'User toggle' }, { val: 'derived', l: 'Auto-derived' }].map((opt, i) => (
                <button key={opt.val} type="button" onClick={() => set('type')(opt.val)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-all ${i > 0 ? 'border-l border-surface-300' : ''} ${d.type === opt.val ? 'bg-ink text-surface-50' : 'bg-surface-50 text-ink-muted hover:bg-surface-100'}`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
          {d.type === 'derived' && (
            <>
              <Select label="Dimension" value={(d as any).dimKey ?? 'corners'}
                onChange={e => set('dimKey')(e.target.value)}
                options={allDims.map(p => ({ value: p.key, label: (p.icon ?? '🔗') + ' ' + ((p as any).label ?? (p as any).name) + ' (' + p.unit + ')' }))}
                className="w-48" />
              <Select label="Operator" value={(d as any).operator ?? '>'}
                onChange={e => set('operator')(e.target.value)}
                options={OPS} className="w-20" />
              <NumberInput label="Threshold" value={(d as any).threshold ?? 0} step="any" min={0}
                onChange={e => set('threshold')(parseFloat(e.target.value))} unit={resolvedUnit} className="w-28" />
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="primary"   onClick={onSave}   icon={<Check className="w-3.5 h-3.5" />}>Save</Button>
          <Button size="sm" variant="secondary" onClick={onCancel} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
        </div>
      </div>
      {/* Field Guide: inline on xl+, floating on small screens */}
      {guideItems.length > 0 && (
        <>
          <div className="hidden xl:block">
            <FieldGuide type={d.type} items={guideItems} />
          </div>
          <div className="xl:hidden">
            <Button size="xs" variant={guideOpen ? 'primary' : 'secondary'}
              onClick={() => setGuideOpen(v => !v)}
              icon={<BookOpen className="w-3 h-3" />}>
              Field Guide
            </Button>
            <FloatingPanel open={guideOpen} onClose={() => setGuideOpen(false)} title="Field Guide"
              icon={<BookOpen className="w-3.5 h-3.5 text-primary" />} width="w-80">
              <FieldGuide type={d.type} items={guideItems} />
            </FloatingPanel>
          </div>
        </>
      )}
    </div>
  )}

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div>
          <h3 className="font-semibold text-sm text-ink">🏷️ Custom Criteria</h3>
          <p className="text-xs text-ink-muted mt-0.5">Boolean conditions that gate materials. User-toggled or auto-derived from dimensions.</p>
        </div>
        <Button size="sm" onClick={() => setAdding(v => !v)} icon={<Plus className="w-3.5 h-3.5" />}>Add Criterion</Button>
      </div>

      {adding && (
        <div className="p-5 bg-surface-100 border-b border-surface-200">
          <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-4">New Criterion</div>
          <CriterionForm d={draft} set={sd} onSave={add} onCancel={() => setAdding(false)} />
        </div>
      )}

      {customCriteria.length === 0 && !adding && (
        <div className="py-10 text-center text-sm text-ink-faint">No criteria defined yet.</div>
      )}

      <div className="divide-y divide-surface-200/40">
        {customCriteria.map(cr => {
          const isEd    = editingId === cr.id
          const dimInfo = allDims.find(d => d.key === cr.dimKey)
          return (
            <div key={cr.id} className={isEd ? 'bg-primary/5' : ''}>
              <div className="px-5 py-3 flex items-start gap-3">
                <div className="w-9 h-9 flex items-center justify-center text-lg flex-shrink-0 rounded-xl bg-surface-200/40">
                  {cr.icon ?? '🏷️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-ink">{cr.name}</span>
                    <span className="badge bg-surface-100 text-ink-faint text-[10px]">
                      {cr.type === 'input' ? '👤 User toggle' : '⚙️ Auto-derived'}
                    </span>
                  </div>
                  <div className="text-xs text-ink-faint mt-0.5">
                    {cr.type === 'input'
                      ? cr.description ?? 'User toggles in calculator'
                      : `Auto: ${(dimInfo as any)?.label ?? cr.dimKey} ${cr.operator} ${cr.threshold}`}
                  </div>
                  <code className="text-[10px] text-ink-faint bg-surface-100 px-1 py-0.5 mt-0.5 inline-block"
                    style={{ borderRadius: 'var(--radius)' }}>{cr.key}</code>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="xs" variant={isEd ? 'primary' : 'ghost'}
                    onClick={() => isEd ? cancelEdit() : startEdit(cr)}
                    icon={<Edit3 className="w-3 h-3" />}>
                    {isEd ? 'Cancel' : 'Edit'}
                  </Button>
                  <Button size="xs" variant="danger-ghost" onClick={() => setDeleteId(cr.id)} icon={<Trash2 className="w-3 h-3" />} />
                </div>
              </div>
              {isEd && editDraft && (
                <div className="px-5 pb-5 border-t border-primary/20 pt-4">
                  <CriterionForm d={editDraft} set={se} onSave={saveEdit} onCancel={cancelEdit} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <ConfirmModal
        open={deleteId !== null}
        title="Delete criterion?"
        message="Materials and activities gated on this criterion will lose their gate."
        onConfirm={() => { remove(deleteId!); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
