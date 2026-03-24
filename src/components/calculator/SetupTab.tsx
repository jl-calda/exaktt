// src/components/calculator/SetupTab.tsx
'use client'
import { useState, useEffect } from 'react'
import type { MtoSystem, GlobalTag, Material } from '@/types'
import { nanoid } from 'nanoid'
import { BookOpen } from 'lucide-react'
import { PRIMITIVE_DIMS, INPUT_MODELS, DIMS_FOR_INPUT_MODEL, LINEAR_UNITS, UNIT_SELECTABLE_DIMS } from '@/lib/engine/constants'
import { normalizeInputModel } from '@/types'
import { Button }          from '@/components/ui/Button'
import { ColorPicker }     from '@/components/ui/ColorPicker'
import { IconPicker }      from '@/components/ui/IconPicker'
import FloatingPanel       from './FloatingPanel'
import CustomDimsPanel     from './panels/CustomDimsPanel'
import CriteriaPanel       from './panels/CriteriaPanel'
import WarningsPanel       from './panels/WarningsPanel'
import VariantsPanel       from './panels/VariantsPanel'
import WorkActivitiesPanel from './panels/WorkActivitiesPanel'
import BracketRulesPanel   from './panels/BracketRulesPanel'
import MaterialsTable      from './panels/MaterialsTable'
import SystemOverviewPanel from './SystemOverviewPanel'

interface Props {
  sys:          MtoSystem
  onUpdate:     (patch: Partial<MtoSystem>) => void
  globalTags?:  GlobalTag[]
  onViewGraph?: () => void
}

const STEPS = [
  { n: 1, label: 'Inputs',        desc: 'What the calculator asks the user for' },
  { n: 2, label: 'Derived',       desc: 'Quantities computed from inputs' },
  { n: 3, label: 'Gates',         desc: 'Criteria and warnings that filter materials' },
  { n: 4, label: 'Variants',      desc: 'User choices that swap product codes' },
  { n: 5, label: 'Sub-assemblies',desc: 'Quantity rules for declared sub-assemblies' },
  { n: 6, label: 'Materials',     desc: 'BOM items output by the calculator' },
  { n: 7, label: 'Schedule',      desc: 'Work activities driven by the BOM' },
]

function StepHeader({ step, children }: { step: typeof STEPS[number]; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-ink-muted bg-surface-100 border border-surface-200 flex-shrink-0"
          style={{ borderRadius: 'var(--radius)' }}>
          {step.n}
        </div>
        <span className="text-xs font-semibold text-ink">{step.label}</span>
        <span className="text-xs text-ink-faint">— {step.desc}</span>
        <div className="flex-1 h-px bg-surface-200" />
      </div>
      <div className="space-y-3 pl-3.5 border-l-2 border-surface-200">
        {children}
      </div>
    </div>
  )
}

export default function SetupTab({ sys, onUpdate, globalTags = [], onViewGraph }: Props) {
  const [library,       setLibrary]       = useState<any[]>([])
  const [showOverview,  setShowOverview]  = useState(false)

  useEffect(() => {
    fetch('/api/mto/library').then(r => r.json()).then(({ data }) => { if (data) setLibrary(data) })
  }, [])

  const saveMat = (updated: Material) =>
    onUpdate({ materials: sys.materials.map(m => m.id === updated.id ? { ...updated, _updatedAt: Date.now() } : m) })

  const deleteMat = (id: string) => {
    if (!confirm('Delete this material?')) return
    onUpdate({ materials: sys.materials.filter(m => m.id !== id) })
  }

  const addMat = (mat: Material) =>
    onUpdate({ materials: [...sys.materials, mat] })

  const makeUnique = (id: string) =>
    onUpdate({ materials: sys.materials.map(m =>
      m.id === id ? { ...m, libraryRef: null, _madeUniqueAt: Date.now(), _systemSpecific: true } : m
    )})

  const syncFromLib = (id: string) => {
    const mat     = sys.materials.find(m => m.id === id)
    const libItem = mat?.libraryRef ? library.find((l: any) => l.id === mat.libraryRef) : null
    if (!libItem) return
    onUpdate({ materials: sys.materials.map(m =>
      m.id === id
        ? { ...m, name: libItem.name, unit: libItem.unit, productCode: libItem.productCode ?? m.productCode, properties: libItem.properties ?? m.properties, _libSyncedAt: Date.now() }
        : m
    )})
  }

  const addFromLib = (libItem: any) => {
    const newMat: Material = {
      id: nanoid(), name: libItem.name, unit: libItem.unit,
      notes: libItem.notes ?? '', photo: libItem.photo ?? null,
      productCode: libItem.productCode ?? '', category: libItem.category ?? 'other',
      properties: libItem.properties ?? {}, tags: libItem.tags ?? [],
      spec: libItem.spec ?? null, customDimKey: null, ruleSet: [],
      criteriaKeys: [], variantTags: {}, libraryRef: libItem.id,
      _libSyncedAt: Date.now(), _createdAt: Date.now(), _updatedAt: Date.now(),
      substrate: 'all', _systemSpecific: false, _createdInSystem: null,
      _wasLibrary: null, _madeUniqueAt: null,
    }
    onUpdate({ materials: [...sys.materials, newMat] })
  }

  return (
    <div className="flex flex-col gap-6 items-start relative">

    {/* Floating toggle buttons — bottom-right stack */}
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
      <Button size="sm"
        variant={showOverview ? 'primary' : 'secondary'}
        onClick={() => setShowOverview(v => !v)}
        icon={<BookOpen className="w-3.5 h-3.5" />}
        className="shadow-lg">
        Overview
      </Button>
    </div>

    {/* Floating Overview sidebar */}
    <FloatingPanel open={showOverview} onClose={() => setShowOverview(false)} title="System Overview"
      icon={<BookOpen className="w-3.5 h-3.5 text-primary" />}>
      <SystemOverviewPanel sys={sys} onViewGraph={onViewGraph} />
    </FloatingPanel>

    <div className="flex-1 min-w-0 space-y-4 w-full">

      {/* ── System Identity ── */}
      <div className="border border-surface-200 bg-surface-50 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
        <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ background: 'var(--color-surface-100)', borderColor: 'var(--color-surface-200)' }}>
          <div className="w-6 h-6 flex items-center justify-center text-base flex-shrink-0"
            style={{ background: sys.color + '18', border: `1.5px solid ${sys.color}30`, borderRadius: 'var(--radius)' }}>
            {sys.icon}
          </div>
          <span className="text-xs font-semibold text-ink">{sys.name || 'System Identity'}</span>
          {sys.description && <span className="text-xs text-ink-muted truncate">— {sys.description}</span>}
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-48">
              <label className="label text-ink-muted">Name</label>
              <input value={sys.name} onChange={e => onUpdate({ name: e.target.value })} className="input" style={{ borderColor: 'var(--color-surface-200)' }} />
            </div>
            <div className="w-32">
              <label className="label text-ink-muted">Short Name</label>
              <input value={sys.shortName ?? ''} onChange={e => onUpdate({ shortName: e.target.value })} className="input" placeholder="e.g. VLL" maxLength={12} style={{ borderColor: 'var(--color-surface-200)' }} />
            </div>
            <div className="flex-1 min-w-48">
              <label className="label text-ink-muted">Description</label>
              <input value={sys.description ?? ''} onChange={e => onUpdate({ description: e.target.value })} className="input" placeholder="Optional" style={{ borderColor: 'var(--color-surface-200)' }} />
            </div>
            <IconPicker label="Icon" value={sys.icon} onChange={icon => onUpdate({ icon })} />
            <ColorPicker label="Colour" value={sys.color} onChange={color => onUpdate({ color })} />
          </div>
        </div>
      </div>

      {/* ── Step 1: Input Model ── */}
      <StepHeader step={STEPS[0]}>
        <div className="border border-surface-200 bg-surface-50 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
          <div className="px-5 py-4 border-b" style={{ background: 'var(--color-surface-100)', borderColor: 'var(--color-surface-200)' }}>
            <h3 className="font-semibold text-sm text-ink">📐 Input Model</h3>
            <p className="text-xs text-ink-muted mt-0.5">How dimensions are entered in the calculator.</p>
          </div>
          <div className="p-4">
          <div className="flex gap-3 flex-wrap">
            {/* Built-in model cards */}
            {INPUT_MODELS.map(opt => {
              const normalized = normalizeInputModel(sys.inputModel)
              return (
                <button key={opt.value} type="button" onClick={() => onUpdate({ inputModel: opt.value as any })}
                  className={`flex-1 min-w-36 text-left p-4 border transition-all ${
                    normalized === opt.value
                      ? 'border-primary bg-primary/10'
                      : 'border-surface-300 bg-surface-100 hover:border-surface-300 hover:bg-surface-100'
                  }`}
                  style={{ borderRadius: 'var(--radius-card)' }}>
                  <div className="text-lg mb-1">{opt.icon}</div>
                  <div className="font-semibold text-xs text-ink">{opt.label}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">{opt.desc}</div>
                </button>
              )
            })}

          </div>

          {/* Primitive dim pills — split into user-entered (editable labels) and auto-counted */}
          {(() => {
            const dimKeys = DIMS_FOR_INPUT_MODEL[sys.inputModel] ?? DIMS_FOR_INPUT_MODEL[normalizeInputModel(sys.inputModel)] ?? []
            const available = PRIMITIVE_DIMS.filter(d => dimKeys.includes(d.key))
            const autoCounted = new Set(['corners', 'end1', 'end2', 'both_ends', 'perimeter'])
            const userEntered = available.filter(d => !autoCounted.has(d.key))
            const autoEntries = available.filter(d => autoCounted.has(d.key))

            const renderDimPill = (d: typeof PRIMITIVE_DIMS[number], editable: boolean) => {
              const customLabel = sys.dimOverrides?.[d.key]?.label
              const displayLabel = customLabel || d.label
              return (
                <span key={d.key}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 bg-surface-100 text-ink border border-surface-200"
                  style={{ borderRadius: 'var(--radius)' }}>
                  <span className="text-sm leading-none">{d.icon}</span>
                  {editable ? (
                    <input
                      type="text"
                      value={displayLabel}
                      placeholder={d.label}
                      onChange={e => onUpdate({ dimOverrides: { ...sys.dimOverrides, [d.key]: { ...sys.dimOverrides?.[d.key], label: e.target.value } } })}
                      onBlur={e => {
                        if (!e.target.value.trim()) {
                          const existing = sys.dimOverrides?.[d.key]
                          if (existing) {
                            const { label: _, ...rest } = existing
                            const next = { ...sys.dimOverrides, [d.key]: rest }
                            if (!rest.unit) delete next[d.key]
                            onUpdate({ dimOverrides: next })
                          }
                        }
                      }}
                      className="bg-transparent border-none outline-none text-[11px] font-medium text-ink w-16 p-0 focus:ring-0 focus:underline"
                      style={{ minWidth: '3ch', width: `${Math.max(3, displayLabel.length)}ch` }}
                    />
                  ) : (
                    <span>{d.label}</span>
                  )}
                  {d.unit && (
                    editable && UNIT_SELECTABLE_DIMS.has(d.key) ? (
                      <select
                        value={sys.dimOverrides?.[d.key]?.unit ?? d.unit}
                        onChange={e => onUpdate({
                          dimOverrides: { ...sys.dimOverrides, [d.key]: { ...sys.dimOverrides?.[d.key], unit: e.target.value } }
                        })}
                        className="text-[10px] text-ink-faint opacity-70 bg-transparent border-none outline-none cursor-pointer p-0 focus:ring-0"
                      >
                        {LINEAR_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    ) : (
                      <span className="text-[10px] text-ink-faint opacity-70">({d.unit})</span>
                    )
                  )}
                </span>
              )
            }

            return (
              <div className="mt-4 space-y-3">
                {/* User-entered measurements */}
                {userEntered.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide mb-2">
                      Measurements — click label to rename
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {userEntered.map(d => renderDimPill(d, true))}
                    </div>
                  </div>
                )}

                {/* Auto-counted dims */}
                {autoEntries.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide mb-2">
                      Automatically counted
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {autoEntries.map(d => renderDimPill(d, false))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
          </div>
        </div>
      </StepHeader>

      {/* ── Step 2: Custom Dimensions ── */}
      <StepHeader step={STEPS[1]}>
        <CustomDimsPanel customDims={sys.customDims} onChange={d => onUpdate({ customDims: d })} sysMats={sys.materials} sys={sys} />
      </StepHeader>

      {/* ── Step 3: Criteria + Warnings ── */}
      <StepHeader step={STEPS[2]}>
        <CriteriaPanel customCriteria={sys.customCriteria} customDims={sys.customDims} inputModel={sys.inputModel} onChange={c => onUpdate({ customCriteria: c })} />
        <WarningsPanel warnings={sys.warnings} onChange={w => onUpdate({ warnings: w })} customDims={sys.customDims} inputModel={sys.inputModel} dimOverrides={sys.dimOverrides} />
      </StepHeader>

      {/* ── Step 4: Variants ── */}
      <StepHeader step={STEPS[3]}>
        <VariantsPanel variants={sys.variants} onChange={v => onUpdate({ variants: v })} />
      </StepHeader>

      {/* ── Step 5: Sub-assembly Rules ── */}
      <StepHeader step={STEPS[4]}>
        <BracketRulesPanel
          templates={sys.customBrackets ?? []}
          setupBrackets={sys.setupBrackets ?? []}
          materials={sys.materials}
          customDims={sys.customDims ?? []}
          customCriteria={sys.customCriteria ?? []}
          variants={sys.variants ?? []}
          onChange={sb => onUpdate({ setupBrackets: sb })}
        />
      </StepHeader>

      {/* ── Step 6: Materials ── */}
      <StepHeader step={STEPS[5]}>
        <MaterialsTable
          inputModel={sys.inputModel}
          materials={sys.materials}
          customDims={sys.customDims}
          customCriteria={sys.customCriteria}
          variants={sys.variants}
          globalTags={globalTags}
          library={library}
          customBrackets={sys.customBrackets ?? []}
          sysId={sys.id}
          onSave={saveMat}
          onDelete={deleteMat}
          onMakeUnique={makeUnique}
          onSyncFromLib={syncFromLib}
          onAddFromLib={addFromLib}
        />
      </StepHeader>

      {/* ── Step 7: Work Activities ── */}
      <StepHeader step={STEPS[6]}>
        <WorkActivitiesPanel
          workActivities={sys.workActivities ?? []}
          materials={sys.materials}
          customCriteria={sys.customCriteria}
          customBrackets={sys.customBrackets ?? []}
          onChange={a => onUpdate({ workActivities: a })}
          dimOverrides={sys.dimOverrides}
        />
      </StepHeader>
    </div>

  </div>
  )
}
