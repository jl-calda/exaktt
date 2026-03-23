// src/components/calculator/panels/WorkActivitiesPanel.tsx
'use client'
import { useState } from 'react'
import { nanoid } from 'nanoid'
import { Plus, Trash2, Edit3, Check, X, Clock, Users, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Input, NumberInput } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { WorkActivity, ActivityPhase, ActivityRateType, SpeedMode, Material, CustomCriterion, WorkBracket } from '@/types'
import { PRIMITIVE_DIMS } from '@/lib/engine/constants'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { IconPicker }  from '@/components/ui/IconPicker'

interface Props {
  workActivities: WorkActivity[]
  materials:      Material[]
  customCriteria: CustomCriterion[]
  customBrackets: WorkBracket[]
  onChange:       (activities: WorkActivity[]) => void
}

const PHASES: { value: ActivityPhase; label: string; icon: string }[] = [
  { value: 'fabrication',   label: 'Fabrication',   icon: '🔧' },
  { value: 'installation',  label: 'Installation',  icon: '🏗️' },
  { value: 'commissioning', label: 'Commissioning', icon: '✅' },
  { value: 'transport',     label: 'Transport',     icon: '🚛' },
  { value: 'third_party',   label: 'Third Party',   icon: '🤝' },
]

const RATE_TYPES: { value: ActivityRateType; label: string }[] = [
  { value: 'per_material_qty', label: 'Per material qty' },
  { value: 'per_bracket_qty',  label: 'Per bracket qty' },
  { value: 'per_dim',          label: 'Per dimension value' },
  { value: 'per_run',          label: 'Per run (fixed per run)' },
  { value: 'per_job',          label: 'Per job (once)' },
  { value: 'third_party_unit', label: '3rd party — per unit' },
  { value: 'third_party_day',  label: '3rd party — per day' },
  { value: 'third_party_lump', label: '3rd party — lump sum' },
]

const PHASE_COLORS: Record<ActivityPhase, string> = {
  fabrication:   '#7c3aed',
  installation:  '#0284c7',
  commissioning: '#16a34a',
  transport:     '#ca8a04',
  third_party:   '#9f1239',
}

const FIELD_ITEMS = [
  { label: 'Phase',        desc: 'Fabrication, Installation, Commissioning, Transport or Third Party — groups activities in the output.' },
  { label: 'Rate type',    desc: 'How qty is derived: per material qty, per dimension value, once per run, once per job, or third-party pricing.' },
  { label: 'Speed mode',   desc: '"Time/unit" = minutes per unit (e.g. 12 min/bracket). "Rate" = units per hour (e.g. 15 m/hr). Both converted to hours.' },
  { label: 'Crew size',    desc: 'Number of workers. Duration = total hours ÷ crew size. Cost = total hours × rate (crew not multiplied).' },
  { label: 'Labour rate',  desc: 'S$/hr applied to total man-hours to compute labour cost on the report.' },
  { label: 'Criteria gate', desc: 'Activity is included only when the selected criteria are ON in the calculator run.' },
]

function FieldGuide() {
  return (
    <div className="bg-surface-100 border border-surface-200 px-4 py-3 space-y-3 animate-fade-in"
      style={{ borderRadius: 'var(--radius)' }}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Field guide</div>
      {FIELD_ITEMS.map(item => (
        <div key={item.label}>
          <div className="text-xs font-semibold text-ink mb-0.5">{item.label}</div>
          <div className="text-[10px] text-ink-faint italic leading-snug">{item.desc}</div>
        </div>
      ))}
    </div>
  )
}

const BLANK: Omit<WorkActivity, 'id'> = {
  name:         '',
  phase:        'installation',
  icon:         '🏗️',
  color:        '#0284c7',
  rateType:     'per_material_qty',
  speedMode:    'time_per_unit',
  timePerUnit:  undefined,
  ratePerHr:    undefined,
  crewSize:     1,
  criteriaKeys: [],
}

function ActivityForm({
  d, set, materials, customCriteria, customBrackets, onSave, onCancel, label,
}: {
  d: Partial<WorkActivity>
  set: (k: keyof Omit<WorkActivity, 'id'>) => (v: any) => void
  materials: Material[]
  customCriteria: CustomCriterion[]
  customBrackets: WorkBracket[]
  onSave: () => void
  onCancel: () => void
  label: string
}) {
  const allDims = PRIMITIVE_DIMS
  const isThirdParty = d.rateType?.startsWith('third_party') ?? false

  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <div className="space-y-3">
    <div className="flex-1 min-w-0 space-y-4">
      <div className="flex flex-wrap gap-3">
        <IconPicker label="Icon" value={d.icon ?? ''} onChange={v => set('icon')(v)} />
        <ColorPicker label="Colour" value={d.color ?? '#0284c7'} onChange={v => set('color')(v)} />
        <Input label="Activity name" value={d.name ?? ''} onChange={e => set('name')(e.target.value)}
          placeholder="e.g. Install bracket" className="flex-1 min-w-48" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Select label="Phase" value={d.phase ?? 'installation'} onChange={e => {
          const phase = e.target.value as ActivityPhase
          const icon = PHASES.find(p => p.value === phase)?.icon ?? '🏗️'
          set('phase')(phase); set('icon')(icon); set('color')(PHASE_COLORS[phase])
        }} options={PHASES.map(p => ({ value: p.value, label: p.icon + ' ' + p.label }))} className="w-44" />

        <Select label="Rate type" value={d.rateType ?? 'per_material_qty'} onChange={e => set('rateType')(e.target.value)}
          options={RATE_TYPES} className="w-52" />
      </div>

      {d.rateType === 'per_material_qty' && (
        <Select label="Source material" value={d.sourceMaterialId ?? ''} onChange={e => set('sourceMaterialId')(e.target.value)}
          options={[{ value: '', label: '— pick material —' }, ...materials.map(m => ({ value: m.id, label: m.name + (m.unit ? ' (' + m.unit + ')' : '') }))]}
          className="w-64" />
      )}

      {d.rateType === 'per_bracket_qty' && (
        <Select label="Source bracket" value={d.sourceBracketId ?? ''} onChange={e => set('sourceBracketId')(e.target.value)}
          options={[{ value: '', label: '— pick bracket —' }, ...customBrackets.map(b => ({ value: b.id, label: b.icon + ' ' + b.name + (b.code ? ' (' + b.code + ')' : '') }))]}
          className="w-64" />
      )}

      {d.rateType === 'per_dim' && (
        <Select label="Source dimension" value={d.sourceDimKey ?? ''} onChange={e => set('sourceDimKey')(e.target.value)}
          options={[{ value: '', label: '— pick dim —' }, ...allDims.map(p => ({ value: p.key, label: (p.icon ?? '') + ' ' + p.label }))]}
          className="w-52" />
      )}

      {!isThirdParty && (
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex overflow-hidden border border-surface-300 self-end mb-px" style={{ borderRadius: 'var(--radius)' }}>
            {([['time_per_unit', '⏱ Time/unit'], ['rate', '⚡ Rate']] as const).map(([v, l], i) => (
              <button key={v} type="button" onClick={() => set('speedMode')(v)}
                className={'py-2 px-3 text-xs font-semibold ' + (i > 0 ? 'border-l border-surface-300 ' : '') + (d.speedMode === v ? 'bg-primary text-white' : 'bg-surface-50 text-ink-muted')}>
                {l}
              </button>
            ))}
          </div>
          {d.speedMode === 'time_per_unit'
            ? <NumberInput label="Min per unit" value={d.timePerUnit ?? ''} step="any" min={0}
                onChange={e => set('timePerUnit')(parseFloat(e.target.value) || undefined)} className="w-32" />
            : <NumberInput label="Units per hour" value={d.ratePerHr ?? ''} step="any" min={0}
                onChange={e => set('ratePerHr')(parseFloat(e.target.value) || undefined)} className="w-32" />
          }
          <NumberInput label="Crew size" value={d.crewSize ?? 1} step={1} min={1}
            onChange={e => set('crewSize')(parseInt(e.target.value) || 1)} className="w-24" />
        </div>
      )}

      {isThirdParty && (
        <div className="flex flex-wrap gap-3">
          <NumberInput label="Rate (S$)" value={d.thirdPartyRate ?? ''} step="any" min={0}
            onChange={e => set('thirdPartyRate')(parseFloat(e.target.value) || undefined)} className="w-36" />
          <Input label="Supplier" value={d.thirdPartySupplier ?? ''} onChange={e => set('thirdPartySupplier')(e.target.value)}
            placeholder="Optional" className="w-48" />
        </div>
      )}

      {!isThirdParty && (
        <div className="flex flex-wrap gap-3">
          <Input label="Labour category" value={d.labourCategory ?? ''} onChange={e => set('labourCategory')(e.target.value)}
            placeholder="e.g. Site erection" className="w-48" />
          <NumberInput label="Rate S$/hr (Pro)" value={d.labourRateHr ?? ''} step="any" min={0}
            onChange={e => set('labourRateHr')(parseFloat(e.target.value) || undefined)} className="w-32" />
        </div>
      )}

      {customCriteria.filter(c => c.type === 'input').length > 0 && (
        <div>
          <label className="label">Criteria gates (only include when…)</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {customCriteria.filter(c => c.type === 'input').map(cr => {
              const active = (d.criteriaKeys ?? []).includes(cr.key)
              return (
                <button key={cr.key} type="button"
                  onClick={() => {
                    const keys = d.criteriaKeys ?? []
                    set('criteriaKeys')(active ? keys.filter(k => k !== cr.key) : [...keys, cr.key])
                  }}
                  className="text-xs px-2.5 py-1 border transition-all"
                  style={active
                    ? { borderRadius: 'var(--radius)', background: cr.color + '20', borderColor: cr.color, color: cr.color, fontWeight: 600 }
                    : { borderRadius: 'var(--radius)', background: 'var(--color-surface-50)', borderColor: '#e2e8f0', color: '#64748b' }}>
                  {cr.icon} {cr.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="primary" onClick={onSave} icon={<Check className="w-3.5 h-3.5" />}>{label}</Button>
        <Button size="sm" variant="secondary" onClick={onCancel} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
      </div>
    </div>
    {/* Field Guide toggle */}
    <div>
      <button onClick={() => setGuideOpen(v => !v)}
        className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 border transition-colors ${guideOpen ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-100 border-surface-200 text-ink-faint hover:text-ink-muted'}`}
        style={{ borderRadius: 'var(--radius)' }}>
        <BookOpen className="w-3 h-3" />
        Field Guide
      </button>
      {guideOpen && <div className="mt-2"><FieldGuide /></div>}
    </div>
    </div>
  )
}

export default function WorkActivitiesPanel({ workActivities, materials, customCriteria, customBrackets, onChange }: Props) {
  const [adding,    setAdding]    = useState(false)
  const [draft,     setDraft]     = useState<Omit<WorkActivity, 'id'>>({ ...BLANK })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<WorkActivity | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  const sd = (k: keyof typeof BLANK) => (v: any) => setDraft(d => ({ ...d, [k]: v }))
  const se = (k: keyof WorkActivity)  => (v: any) => setEditDraft(d => d ? { ...d, [k]: v } : d)

  const add = () => {
    if (!draft.name.trim()) return
    onChange([...workActivities, { ...draft, id: nanoid(), crewSize: draft.crewSize ?? 1, criteriaKeys: draft.criteriaKeys ?? [] }])
    setDraft({ ...BLANK }); setAdding(false)
  }

  const remove     = (id: string) => onChange(workActivities.filter(a => a.id !== id))
  const startEdit  = (a: WorkActivity) => { setEditingId(a.id); setEditDraft({ ...a }); setAdding(false) }
  const cancelEdit = () => { setEditingId(null); setEditDraft(null) }
  const saveEdit   = () => {
    if (!editDraft?.name.trim()) return
    onChange(workActivities.map(a => a.id === editingId ? { ...editDraft } : a))
    cancelEdit()
  }

  const phaseOrder: ActivityPhase[] = ['fabrication', 'installation', 'commissioning', 'transport', 'third_party']
  const sorted = [...workActivities].sort((a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase))

  const fmtRate = (act: WorkActivity) => {
    if (act.rateType?.startsWith('third_party')) return 'S$' + (act.thirdPartyRate ?? '—') + (act.rateType === 'third_party_day' ? '/day' : act.rateType === 'third_party_unit' ? '/unit' : ' lump')
    if (act.speedMode === 'rate') return (act.ratePerHr ?? '—') + ' units/hr'
    return (act.timePerUnit ?? '—') + ' min/unit'
  }

  return (
    <div className="border border-secondary-200 bg-surface-50 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'var(--color-secondary-100)', borderColor: 'var(--color-secondary-200)' }}>
        <div>
          <h3 className="font-semibold text-sm text-secondary-700">⚙️ Work Activities</h3>
          <p className="text-xs text-secondary-600 mt-0.5">Fabrication, installation and third-party activities — time and cost per run.</p>
        </div>
        <Button size="sm" onClick={() => { setAdding(v => !v); setEditingId(null) }} icon={<Plus className="w-3.5 h-3.5" />} className="!border-secondary-200 !text-secondary-700">Add Activity</Button>
      </div>

      {adding && (
        <div className="p-5 bg-surface-100 border-b border-secondary-200">
          <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-4">New Activity</div>
          <ActivityForm d={draft} set={sd} materials={materials} customCriteria={customCriteria} customBrackets={customBrackets}
            onSave={add} onCancel={() => setAdding(false)} label="Add" />
        </div>
      )}

      {workActivities.length === 0 && !adding && (
        <div className="py-10 text-center text-sm text-ink-faint">
          No work activities defined. Example: "Install bracket — 12 min each" or "Cable tensioning — 15m/hr".
        </div>
      )}

      <div className="divide-y divide-secondary-200">
        {sorted.map(act => {
          const isEd = editingId === act.id
          const phaseInfo = PHASES.find(p => p.value === act.phase)
          return (
            <div key={act.id} className={isEd ? 'bg-primary/5' : ''}>
              <div className="px-5 py-3 flex items-start gap-3">
                <span className="text-lg flex-shrink-0 mt-0.5">{act.icon || phaseInfo?.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-ink">{act.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: (act.color ?? PHASE_COLORS[act.phase]) + '20', color: act.color ?? PHASE_COLORS[act.phase] }}>
                      {phaseInfo?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-ink-muted">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtRate(act)}</span>
                    {(act.crewSize ?? 1) > 1 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{act.crewSize} crew</span>}
                    {act.labourCategory && <span className="text-ink-faint">{act.labourCategory}</span>}
                    {(act.criteriaKeys ?? []).length > 0 && (
                      <span className="text-amber-600 font-medium">⚡ gated</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="xs" variant={isEd ? 'primary' : 'ghost'} onClick={() => isEd ? cancelEdit() : startEdit(act)} icon={<Edit3 className="w-3 h-3" />}>
                    {isEd ? 'Cancel' : 'Edit'}
                  </Button>
                  <Button size="xs" variant="danger" onClick={() => setDeleteId(act.id)} icon={<Trash2 className="w-3 h-3" />} />
                </div>
              </div>
              {isEd && editDraft && (
                <div className="px-5 pb-5 border-t border-primary/20 pt-4">
                  <ActivityForm d={editDraft} set={se} materials={materials} customCriteria={customCriteria} customBrackets={customBrackets}
                    onSave={saveEdit} onCancel={cancelEdit} label="Save" />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <ConfirmModal
        open={deleteId !== null}
        title="Delete activity?"
        message="This will permanently remove the activity and all its settings."
        onConfirm={() => { remove(deleteId!); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
