// src/components/calculator/panels/WorkActivitiesPanel.tsx
'use client'
import { useState } from 'react'
import { nanoid } from 'nanoid'
import { Plus, Trash2, Edit3, Check, X, Clock, Users, BookOpen, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Input, NumberInput } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { WorkActivity, WorkActivityRate, ActivityPhase, ActivityRateType, Material, CustomCriterion, WorkBracket } from '@/types'
import { PRIMITIVE_DIMS, getDimUnit, type DimOverride } from '@/lib/engine/constants'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { IconPicker }  from '@/components/ui/IconPicker'
import FloatingPanel from '../FloatingPanel'

interface Props {
  workActivities:    WorkActivity[]
  materials:         Material[]
  customCriteria:    CustomCriterion[]
  customBrackets:    WorkBracket[]
  workActivityRates: WorkActivityRate[]
  onChange:          (activities: WorkActivity[]) => void
  dimOverrides?:     Record<string, DimOverride>
}

/* ── Constants ─────────────────────────────────────────────────────────────── */

const PHASES: { value: ActivityPhase; label: string; icon: string }[] = [
  { value: 'fabrication',   label: 'Fabrication',   icon: '🔧' },
  { value: 'installation',  label: 'Installation',  icon: '🏗️' },
  { value: 'commissioning', label: 'Commissioning', icon: '✅' },
  { value: 'transport',     label: 'Transport',     icon: '🚛' },
  { value: 'third_party',   label: 'Third Party',   icon: '🤝' },
]

const PHASE_COLORS: Record<ActivityPhase, string> = {
  fabrication:   '#7c3aed',
  installation:  '#0284c7',
  commissioning: '#16a34a',
  transport:     '#ca8a04',
  third_party:   '#9f1239',
}

// Rate types for rate-linked activities (no third-party options)
const SOURCE_TYPES: { value: ActivityRateType; label: string }[] = [
  { value: 'per_material_qty', label: 'Per material qty' },
  { value: 'per_bracket_qty',  label: 'Per bracket qty' },
  { value: 'per_dim',          label: 'Per dimension value' },
  { value: 'per_run',          label: 'Per run (fixed per run)' },
  { value: 'per_job',          label: 'Per job (once)' },
]

// All rate types including third-party (for manual mode)
const ALL_RATE_TYPES: { value: ActivityRateType; label: string }[] = [
  ...SOURCE_TYPES,
  { value: 'third_party_unit', label: '3rd party — per unit' },
  { value: 'third_party_day',  label: '3rd party — per day' },
  { value: 'third_party_lump', label: '3rd party — lump sum' },
]

const FIELD_ITEMS = [
  { label: 'Phase',        desc: 'Fabrication, Installation, Commissioning, Transport or Third Party — groups activities in the output.' },
  { label: 'Rate type',    desc: 'How qty is derived: per material qty, per dimension value, once per run, once per job, or third-party pricing.' },
  { label: 'Speed mode',   desc: '"Time/unit" = minutes per unit (e.g. 12 min/bracket). "Rate" = units per hour (e.g. 15 m/hr). Both converted to hours.' },
  { label: 'Crew size',    desc: 'Number of workers. Duration = total hours ÷ crew size. Cost = total hours × rate (crew not multiplied).' },
  { label: 'Activity rate', desc: 'Links to a company-wide rate (Work Category + Labour Category). Defines cost per hour and default speed.' },
  { label: 'Criteria gate', desc: 'Activity is included only when the selected criteria are ON in the calculator run.' },
]

const BLANK: Omit<WorkActivity, 'id'> = {
  name: '', phase: 'installation', icon: '🏗️', color: '#0284c7',
  rateType: 'per_material_qty', speedMode: 'time_per_unit',
  timePerUnit: undefined, ratePerHr: undefined, crewSize: 1, criteriaKeys: [],
}

const PHASE_ORDER: ActivityPhase[] = ['fabrication', 'installation', 'commissioning', 'transport', 'third_party']

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function applyRate(rate: WorkActivityRate): Omit<WorkActivity, 'id'> {
  return {
    name:               rate.name,
    phase:              'fabrication',
    icon:               rate.categoryIcon,
    color:              PHASE_COLORS['fabrication'],
    rateType:           'per_material_qty',
    speedMode:          (rate.speedMode as 'time_per_unit' | 'rate') ?? 'time_per_unit',
    timePerUnit:        rate.defaultTimePerUnit ?? undefined,
    ratePerHr:          rate.defaultRatePerHr ?? undefined,
    crewSize:           rate.crewSize ?? 1,
    workActivityRateId: rate.id,
    _categoryName:      rate.categoryName,
    _categoryIcon:      rate.categoryIcon,
    _rateName:          rate.rateName,
    _rateValue:         rate.rateValue,
    _rateUnitType:      rate.rateUnitType,
    _rateUnitLabel:     rate.rateUnitLabel,
    _labourRateHr:      rate.rateUnitType === 'per_hour' ? rate.rateValue : undefined,
    _unitCost:          rate.rateUnitType !== 'per_hour' ? rate.rateValue : undefined,
    criteriaKeys:       [],
  }
}

function fmtRate(act: WorkActivity, dimOverrides?: Record<string, DimOverride>) {
  if (act.rateType?.startsWith('third_party'))
    return 'S$' + (act.thirdPartyRate ?? '—') + (act.rateType === 'third_party_day' ? '/day' : act.rateType === 'third_party_unit' ? '/unit' : ' lump')
  const u = act.rateType === 'per_dim' && act.sourceDimKey
    ? getDimUnit(act.sourceDimKey, dimOverrides) || 'unit' : 'unit'
  if (act.speedMode === 'rate') return (act.ratePerHr ?? '—') + ' ' + u + '/hr'
  return (act.timePerUnit ?? '—') + ' min/' + u
}

/* ── FieldGuide ────────────────────────────────────────────────────────────── */

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

/* ── RatePicker ────────────────────────────────────────────────────────────── */

function RatePicker({ rates, onSelect, onManual, onCancel }: {
  rates: WorkActivityRate[]
  onSelect: (rate: WorkActivityRate) => void
  onManual: () => void
  onCancel: () => void
}) {
  const grouped = rates.reduce<Record<string, WorkActivityRate[]>>((acc, w) => {
    const cat = w.categoryName || 'Uncategorised'
    ;(acc[cat] ??= []).push(w)
    return acc
  }, {})

  return (
    <div className="p-5 bg-surface-100 border-b border-surface-200 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Pick an Activity Rate</div>
        <Button size="xs" variant="ghost" onClick={onCancel} icon={<X className="w-3 h-3" />}>Cancel</Button>
      </div>

      {rates.length === 0 ? (
        <div className="py-6 text-center text-sm text-ink-faint">
          No activity rates configured yet. Set them up in the Fabrication tab first.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, wars]) => (
            <div key={category}>
              <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide mb-2">
                {wars[0]?.categoryIcon ?? '🔧'} {category}
              </div>
              <div className="flex flex-wrap gap-2">
                {wars.map(w => (
                  <button key={w.id} type="button" onClick={() => onSelect(w)}
                    className="flex items-center gap-2.5 px-3 py-2.5 border border-surface-200 bg-surface-50 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    style={{ borderRadius: 'var(--radius)' }}>
                    <span className="text-lg">{w.categoryIcon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink group-hover:text-primary transition-colors">{w.name}</div>
                      <div className="text-[10px] text-ink-faint">
                        {w.speedMode === 'rate'
                          ? `${w.defaultRatePerHr ?? '—'}/hr`
                          : `${w.defaultTimePerUnit ?? '—'} min/unit`}
                        {(w.crewSize ?? 1) > 1 && <span className="ml-1.5">· {w.crewSize} crew</span>}
                        <span className="ml-1.5">· {w.rateName}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={onManual}
        className="text-xs text-ink-muted hover:text-primary transition-colors underline underline-offset-2">
        Or add a manual / third-party activity
      </button>
    </div>
  )
}

/* ── ActivityForm ──────────────────────────────────────────────────────────── */

function ActivityForm({
  d, set, materials, customCriteria, customBrackets, workActivityRates,
  onSave, onCancel, onChangeRate, label, dimOverrides, isLinked,
}: {
  d: Partial<WorkActivity>
  set: (k: keyof Omit<WorkActivity, 'id'>) => (v: any) => void
  materials: Material[]
  customCriteria: CustomCriterion[]
  customBrackets: WorkBracket[]
  workActivityRates: WorkActivityRate[]
  onSave: () => void
  onCancel: () => void
  onChangeRate?: () => void
  label: string
  dimOverrides?: Record<string, DimOverride>
  isLinked: boolean
}) {
  const allDims = PRIMITIVE_DIMS
  const isThirdParty = d.rateType?.startsWith('third_party') ?? false
  const [guideOpen, setGuideOpen] = useState(false)

  // Determine which rate types to show
  const rateTypeOptions = isLinked ? SOURCE_TYPES : ALL_RATE_TYPES

  return (
    <div className="space-y-3">
    <div className="flex-1 min-w-0 space-y-4">

      {/* Rate banner (when linked to a WorkActivityRate) */}
      {isLinked && d._categoryName && (
        <div className="flex items-center gap-3 px-3 py-2 border border-primary/30 bg-primary/5"
          style={{ borderRadius: 'var(--radius)' }}>
          <span className="text-base">{d._categoryIcon}</span>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-ink">{d._categoryName}</span>
            <span className="text-xs text-ink-muted ml-2">
              {d._rateName} ({d._rateValue}/{d._rateUnitLabel})
            </span>
          </div>
          {onChangeRate && (
            <Button size="xs" variant="ghost" onClick={onChangeRate}>Change</Button>
          )}
        </div>
      )}

      {/* Name + icon/color */}
      <div className="flex flex-wrap gap-4 items-start">
        <IconPicker label="Icon" value={d.icon ?? ''} onChange={v => set('icon')(v)} />
        <ColorPicker label="Colour" value={d.color ?? '#0284c7'} onChange={v => set('color')(v)} />
        <Input label="Activity name" value={d.name ?? ''} onChange={e => set('name')(e.target.value)}
          placeholder="e.g. Install bracket" className="flex-1 min-w-48" />
      </div>

      {/* Phase + Rate type */}
      <div className="flex flex-wrap gap-4 items-start">
        <Select label="Phase" value={d.phase ?? 'installation'} onChange={e => {
          const phase = e.target.value as ActivityPhase
          const icon = PHASES.find(p => p.value === phase)?.icon ?? '🏗️'
          set('phase')(phase); set('icon')(icon); set('color')(PHASE_COLORS[phase])
        }} options={PHASES.map(p => ({ value: p.value, label: p.icon + ' ' + p.label }))} className="w-44" />

        <Select label="Source type" value={d.rateType ?? 'per_material_qty'} onChange={e => set('rateType')(e.target.value)}
          options={rateTypeOptions} className="w-52" />
      </div>

      {/* Conditional source selectors */}
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

      {/* Speed mode + crew (non-third-party) */}
      {!isThirdParty && (
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex overflow-hidden border border-surface-300 self-end mb-px" style={{ borderRadius: 'var(--radius)' }}>
            {([['time_per_unit', '⏱ Time/unit'], ['rate', '⚡ Rate']] as const).map(([v, l], i) => (
              <button key={v} type="button" onClick={() => set('speedMode')(v)}
                className={'py-2 px-3 text-xs font-semibold ' + (i > 0 ? 'border-l border-surface-300 ' : '') + (d.speedMode === v ? 'bg-primary text-white' : 'bg-surface-50 text-ink-muted')}>
                {l}
              </button>
            ))}
          </div>
          {(() => {
            const rateU = d.rateType === 'per_dim' && d.sourceDimKey
              ? getDimUnit(d.sourceDimKey, dimOverrides) || 'unit' : 'unit'
            return d.speedMode === 'time_per_unit'
              ? <NumberInput label={`Min per ${rateU}`} value={d.timePerUnit ?? ''} step="any" min={0}
                  onChange={e => set('timePerUnit')(parseFloat(e.target.value) || undefined)} className="w-32" />
              : <NumberInput label={`${rateU}/hr`} value={d.ratePerHr ?? ''} step="any" min={0}
                  onChange={e => set('ratePerHr')(parseFloat(e.target.value) || undefined)} className="w-32" />
          })()}
          <NumberInput label="Crew size" value={d.crewSize ?? 1} step={1} min={1}
            onChange={e => set('crewSize')(parseInt(e.target.value) || 1)} className="w-24" />
        </div>
      )}

      {/* Third-party rate fields */}
      {isThirdParty && (
        <div className="flex flex-wrap gap-4 items-start">
          <NumberInput label="Rate (S$)" value={d.thirdPartyRate ?? ''} step="any" min={0}
            onChange={e => set('thirdPartyRate')(parseFloat(e.target.value) || undefined)} className="w-36" />
          <Input label="Supplier" value={d.thirdPartySupplier ?? ''} onChange={e => set('thirdPartySupplier')(e.target.value)}
            placeholder="Optional" className="w-48" />
        </div>
      )}

      {/* Activity rate dropdown (manual mode only — rate-linked activities have the banner) */}
      {!isLinked && !isThirdParty && workActivityRates.length > 0 && (
        <div className="flex flex-wrap gap-4 items-start">
          <Select label="Activity Rate (optional)" value={d.workActivityRateId ?? ''} onChange={e => {
            const warId = e.target.value
            set('workActivityRateId')(warId || undefined)
            const war = workActivityRates.find(w => w.id === warId)
            if (war) {
              set('_categoryName')(war.categoryName); set('_categoryIcon')(war.categoryIcon)
              set('_rateName')(war.rateName); set('_rateValue')(war.rateValue)
              set('_rateUnitType')(war.rateUnitType); set('_rateUnitLabel')(war.rateUnitLabel)
              set('_labourRateHr')(war.rateUnitType === 'per_hour' ? war.rateValue : undefined)
              set('_unitCost')(war.rateUnitType !== 'per_hour' ? war.rateValue : undefined)
            } else {
              set('_categoryName')(undefined); set('_categoryIcon')(undefined)
              set('_rateName')(undefined); set('_rateValue')(undefined)
              set('_rateUnitType')(undefined); set('_rateUnitLabel')(undefined)
              set('_labourRateHr')(undefined); set('_unitCost')(undefined)
            }
          }}
            options={[{ value: '', label: '— none —' }, ...workActivityRates.map(w => ({ value: w.id, label: `${w.categoryIcon} ${w.name} (${w.rateValue}/${w.rateUnitLabel})` }))]}
            className="w-64" />
        </div>
      )}

      {/* Criteria gates */}
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

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="primary" onClick={onSave} icon={<Check className="w-3.5 h-3.5" />}>{label}</Button>
        <Button size="sm" variant="secondary" onClick={onCancel} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
      </div>
    </div>

    {/* Field Guide floating toggle */}
    <Button size="xs" variant={guideOpen ? 'primary' : 'secondary'}
      onClick={() => setGuideOpen(v => !v)}
      icon={<BookOpen className="w-3 h-3" />}>
      Field Guide
    </Button>
    <FloatingPanel open={guideOpen} onClose={() => setGuideOpen(false)} title="Field Guide"
      icon={<BookOpen className="w-3.5 h-3.5 text-primary" />} width="w-80">
      <FieldGuide />
    </FloatingPanel>
    </div>
  )
}

/* ── Main Component ────────────────────────────────────────────────────────── */

type Mode = 'idle' | 'picking_rate' | 'adding' | 'editing'

export default function WorkActivitiesPanel({ workActivities, materials, customCriteria, customBrackets, workActivityRates, onChange, dimOverrides }: Props) {
  const [mode,      setMode]      = useState<Mode>('idle')
  const [draft,     setDraft]     = useState<Partial<WorkActivity>>({ ...BLANK })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  const sd = (k: keyof Omit<WorkActivity, 'id'>) => (v: any) => setDraft(d => ({ ...d, [k]: v }))
  const se = (k: keyof Omit<WorkActivity, 'id'>) => (v: any) => setDraft(d => ({ ...d, [k]: v }))

  const resetMode = () => { setMode('idle'); setDraft({ ...BLANK }); setEditingId(null) }

  const addActivity = () => {
    const name = (draft.name ?? '').trim()
    if (!name) return
    onChange([...workActivities, { ...draft as WorkActivity, id: nanoid(), name, crewSize: draft.crewSize ?? 1, criteriaKeys: draft.criteriaKeys ?? [] }])
    resetMode()
  }

  const startEdit = (act: WorkActivity) => {
    setMode('editing'); setEditingId(act.id); setDraft({ ...act })
  }

  const saveEdit = () => {
    const name = (draft.name ?? '').trim()
    if (!name || !editingId) return
    onChange(workActivities.map(a => a.id === editingId ? { ...draft as WorkActivity, id: editingId, name } : a))
    resetMode()
  }

  const remove = (id: string) => onChange(workActivities.filter(a => a.id !== id))

  const onSelectRate = (rate: WorkActivityRate) => {
    setDraft(applyRate(rate)); setMode('adding')
  }

  const onManualAdd = () => {
    setDraft({ ...BLANK }); setMode('adding')
  }

  // Group activities by phase for display
  const grouped = PHASE_ORDER.reduce<Record<ActivityPhase, WorkActivity[]>>((acc, phase) => {
    acc[phase] = workActivities.filter(a => a.phase === phase)
    return acc
  }, {} as Record<ActivityPhase, WorkActivity[]>)

  const hasRates = workActivityRates.length > 0
  const isLinked = !!draft.workActivityRateId

  return (
    <div className="border border-surface-200 bg-surface-50 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'var(--color-surface-100)', borderColor: 'var(--color-surface-200)' }}>
        <div>
          <h3 className="font-semibold text-sm text-ink">⚙️ Work Activities</h3>
          <p className="text-xs text-ink-muted mt-0.5">Fabrication, installation and third-party activities — time and cost per run.</p>
        </div>
        <div className="flex gap-2">
          {hasRates && (
            <Button size="sm" variant="primary" onClick={() => { setMode(mode === 'picking_rate' ? 'idle' : 'picking_rate'); setEditingId(null) }}
              icon={<Zap className="w-3.5 h-3.5" />}>
              Add from Rate
            </Button>
          )}
          <Button size="sm" variant={hasRates ? 'secondary' : 'primary'} onClick={() => { onManualAdd(); setEditingId(null) }}
            icon={<Plus className="w-3.5 h-3.5" />}>
            {hasRates ? 'Add Manual' : 'Add Activity'}
          </Button>
        </div>
      </div>

      {/* Rate hint when no rates exist */}
      {!hasRates && workActivities.length === 0 && mode === 'idle' && (
        <div className="px-5 py-2 text-[10px] text-ink-faint bg-amber-50 border-b border-amber-100">
          Tip: Set up Activity Rates in the Fabrication tab for a faster workflow with pre-filled speed and cost defaults.
        </div>
      )}

      {/* Rate picker */}
      {mode === 'picking_rate' && (
        <RatePicker rates={workActivityRates} onSelect={onSelectRate} onManual={onManualAdd}
          onCancel={resetMode} />
      )}

      {/* Add form */}
      {mode === 'adding' && (
        <div className="p-5 bg-surface-100 border-b border-surface-200">
          <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-4">
            {isLinked ? 'Configure Activity' : 'New Manual Activity'}
          </div>
          <ActivityForm d={draft} set={sd} materials={materials} customCriteria={customCriteria}
            customBrackets={customBrackets} workActivityRates={workActivityRates}
            onSave={addActivity} onCancel={resetMode} label="Add"
            onChangeRate={() => setMode('picking_rate')}
            dimOverrides={dimOverrides} isLinked={isLinked} />
        </div>
      )}

      {/* Empty state */}
      {workActivities.length === 0 && mode === 'idle' && (
        <div className="py-10 text-center text-sm text-ink-faint">
          No work activities defined.{hasRates ? ' Click "Add from Rate" to get started.' : ' Example: "Install bracket — 12 min each" or "Cable tensioning — 15m/hr".'}
        </div>
      )}

      {/* Activity list grouped by phase */}
      <div className="divide-y divide-surface-200">
        {PHASE_ORDER.map(phase => {
          const acts = grouped[phase]
          if (!acts || acts.length === 0) return null
          const phaseInfo = PHASES.find(p => p.value === phase)!
          return (
            <div key={phase}>
              {/* Phase header */}
              <div className="px-5 py-2 flex items-center gap-2" style={{ background: PHASE_COLORS[phase] + '08' }}>
                <span className="text-sm">{phaseInfo.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: PHASE_COLORS[phase] }}>
                  {phaseInfo.label}
                </span>
                <span className="text-[10px] text-ink-faint ml-1">({acts.length})</span>
              </div>

              {/* Activities in this phase */}
              <div className="divide-y divide-surface-100">
                {acts.map(act => {
                  const isEd = mode === 'editing' && editingId === act.id
                  return (
                    <div key={act.id} className={isEd ? 'bg-primary/5' : ''}>
                      <div className="px-5 py-3 flex items-start gap-3">
                        <span className="text-lg flex-shrink-0 mt-0.5">{act.icon || phaseInfo.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-ink">{act.name}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-ink-muted flex-wrap">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtRate(act, dimOverrides)}</span>
                            {(act.crewSize ?? 1) > 1 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{act.crewSize} crew</span>}
                            {act._categoryName && (
                              <span className="text-ink-faint">
                                {act._categoryIcon} {act._categoryName}
                                {act._rateName && <span className="ml-1">· {act._rateName}</span>}
                              </span>
                            )}
                            {(act.criteriaKeys ?? []).length > 0 && (
                              <span className="text-amber-600 font-medium">⚡ gated</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button size="xs" variant={isEd ? 'primary' : 'ghost'} onClick={() => isEd ? resetMode() : startEdit(act)} icon={<Edit3 className="w-3 h-3" />}>
                            {isEd ? 'Cancel' : 'Edit'}
                          </Button>
                          <Button size="xs" variant="danger" onClick={() => setDeleteId(act.id)} icon={<Trash2 className="w-3 h-3" />} />
                        </div>
                      </div>

                      {/* Inline edit form */}
                      {isEd && (
                        <div className="px-5 pb-5 border-t border-primary/20 pt-4">
                          <ActivityForm d={draft} set={se} materials={materials} customCriteria={customCriteria}
                            customBrackets={customBrackets} workActivityRates={workActivityRates}
                            onSave={saveEdit} onCancel={resetMode} label="Save"
                            onChangeRate={() => setMode('picking_rate')}
                            dimOverrides={dimOverrides} isLinked={!!draft.workActivityRateId} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
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
