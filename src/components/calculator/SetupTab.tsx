// src/components/calculator/SetupTab.tsx
'use client'
import { useState, useEffect } from 'react'
import type { MtoSystem, GlobalTag, Material, CustomDim } from '@/types'
import { nanoid } from 'nanoid'
import { Plus, X, BookOpen } from 'lucide-react'
import { PRIMITIVE_DIMS, INPUT_MODELS, DIMS_FOR_INPUT_MODEL } from '@/lib/engine/constants'
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
import CustomBracketsPanel from './panels/CustomBracketsPanel'
import MaterialsTable      from './panels/MaterialsTable'
import SystemOverviewPanel from './SystemOverviewPanel'

interface Props {
  sys:          MtoSystem
  onUpdate:     (patch: Partial<MtoSystem>) => void
  globalTags?:  GlobalTag[]
  onViewGraph?: () => void
}

const INPUT_BLANK = { name: '', unit: '', icon: '📥', inputStep: 1 }

const STEPS = [
  { n: 1, label: 'Inputs',        desc: 'What the calculator asks the user for' },
  { n: 2, label: 'Derived',       desc: 'Quantities computed from inputs' },
  { n: 3, label: 'Gates',         desc: 'Criteria and warnings that filter materials' },
  { n: 4, label: 'Variants',      desc: 'User choices that swap product codes' },
  { n: 5, label: 'Sub-assemblies',desc: 'Custom brackets made of materials' },
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
  const [addingInput,   setAddingInput]   = useState(false)
  const [inputDraft,    setInputDraft]    = useState({ ...INPUT_BLANK })
  const [showOverview,  setShowOverview]  = useState(false)

  const userInputDims = (sys.customDims ?? []).filter(cd => cd.derivType === 'user_input')

  const addUserInput = () => {
    if (!inputDraft.name.trim()) return
    const key = 'ui_' + inputDraft.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).slice(2, 5)
    const newDim: CustomDim = {
      id: nanoid(), key, name: inputDraft.name.trim(),
      unit: inputDraft.unit.trim(), icon: inputDraft.icon, color: '#3b82f6',
      derivType: 'user_input', inputStep: inputDraft.inputStep,
      spacing: 1, spacingMode: 'fixed', spacingLabel: '', spacingTargetDim: 'length',
      firstSupportMode: 'none', firstGap: 300, firstGapLabel: '', firstGapMode: 'fixed',
      includesEndpoints: false, sumKeys: [], formulaQty: 1, formulaDimKey: 'length',
      stockLengths: [], stockTargetDim: 'length', stockOptimMode: 'min_waste',
      plateMaterialId: '', partW: 600, partH: 400, kerf: 3,
      sheetAllowRotation: true, sheetPartsNeededDim: 'custom_a',
    }
    onUpdate({ customDims: [...(sys.customDims ?? []), newDim] })
    setInputDraft({ ...INPUT_BLANK })
    setAddingInput(false)
  }

  const removeUserInput = (id: string) =>
    onUpdate({ customDims: (sys.customDims ?? []).filter(cd => cd.id !== id) })

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

            {/* Additional user-input dim cards */}
            {userInputDims.map(cd => (
              <div key={cd.id}
                className="relative flex-1 min-w-36 text-left p-4 border border-primary/20 bg-primary/5"
                style={{ borderRadius: 'var(--radius-card)' }}>
                <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 bg-surface-100 text-ink-faint uppercase tracking-wide"
                  style={{ borderRadius: 'var(--radius)' }}>
                  + input
                </span>
                <div className="text-lg mb-1">{cd.icon}</div>
                <div className="font-semibold text-xs text-ink">{cd.name}</div>
                <div className="text-[11px] text-ink-muted mt-0.5">{cd.unit ? `(${cd.unit})` : 'custom'}</div>
                <button onClick={() => removeUserInput(cd.id)}
                  className="absolute bottom-2 right-2 text-ink-faint hover:text-red-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Add input card */}
            {addingInput ? (
              <div className="w-full border border-surface-200 bg-surface-50 p-4 flex items-end gap-4 flex-wrap" style={{ borderRadius: 'var(--radius-card)' }}>
                <div className="flex flex-col gap-1 flex-1 min-w-36">
                  <label className="label text-ink-muted">Label</label>
                  <input value={inputDraft.name}
                    onChange={e => setInputDraft(d => ({ ...d, name: e.target.value }))}
                    className="input" placeholder="e.g. Volume" autoFocus
                    style={{ borderColor: 'var(--color-surface-200)' }}
                    onKeyDown={e => e.key === 'Enter' && addUserInput()} />
                </div>
                <div className="flex flex-col gap-1 w-24">
                  <label className="label text-ink-muted">Unit</label>
                  <input value={inputDraft.unit}
                    onChange={e => setInputDraft(d => ({ ...d, unit: e.target.value }))}
                    className="input" placeholder="L"
                    style={{ borderColor: 'var(--color-surface-200)' }} />
                </div>
                <div className="flex flex-col gap-1 w-24">
                  <label className="label text-ink-muted">Step</label>
                  <input type="number" value={inputDraft.inputStep}
                    onChange={e => setInputDraft(d => ({ ...d, inputStep: parseFloat(e.target.value) || 1 }))}
                    className="input" min={0.001} step={0.1}
                    style={{ borderColor: 'var(--color-surface-200)' }} />
                </div>
                <IconPicker label="Icon" value={inputDraft.icon}
                  onChange={v => setInputDraft(d => ({ ...d, icon: v }))} />
                <div className="flex gap-2 pb-0.5">
                  <Button size="sm" variant="primary" onClick={addUserInput}>Add</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setAddingInput(false); setInputDraft({ ...INPUT_BLANK }) }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingInput(true)}
                className="flex-1 min-w-36 p-4 text-left border border-dashed border-surface-300 hover:border-surface-300 hover:bg-surface-100 transition-all group"
                style={{ borderRadius: 'var(--radius-card)' }}>
                <div className="text-lg mb-1 text-ink-muted group-hover:text-ink transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="font-semibold text-xs text-ink-muted group-hover:text-ink transition-colors">Add input</div>
                <div className="text-[11px] text-ink-muted mt-0.5">volume, weight, qty…</div>
              </button>
            )}
          </div>

          {/* Primitive dim pills */}
          {(() => {
            const dimKeys = DIMS_FOR_INPUT_MODEL[sys.inputModel] ?? DIMS_FOR_INPUT_MODEL[normalizeInputModel(sys.inputModel)] ?? []
            const available = PRIMITIVE_DIMS.filter(d => dimKeys.includes(d.key))
            return (
              <div className="mt-4">
                <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide mb-2">
                  Inputs for this model
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {available.map(d => (
                    <span key={d.key}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 bg-surface-100 text-ink border border-surface-200"
                      style={{ borderRadius: 'var(--radius)' }}>
                      <span className="text-sm leading-none">{d.icon}</span>
                      {d.label}
                      {d.unit && <span className="text-[10px] text-ink-faint opacity-70">({d.unit})</span>}
                    </span>
                  ))}
                  {(sys.inputModel === 'linear_run' || normalizeInputModel(sys.inputModel) === 'linear') && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 bg-surface-100 text-ink border border-surface-200"
                      style={{ borderRadius: 'var(--radius)' }}>
                      + segment mode
                    </span>
                  )}
                </div>
              </div>
            )
          })()}
          </div>
        </div>
      </StepHeader>

      {/* ── Step 2: Custom Dimensions ── */}
      <StepHeader step={STEPS[1]}>
        <CustomDimsPanel customDims={sys.customDims} onChange={d => onUpdate({ customDims: d })} sysMats={sys.materials} />
      </StepHeader>

      {/* ── Step 3: Criteria + Warnings ── */}
      <StepHeader step={STEPS[2]}>
        <CriteriaPanel customCriteria={sys.customCriteria} customDims={sys.customDims} onChange={c => onUpdate({ customCriteria: c })} />
        <WarningsPanel warnings={sys.warnings} onChange={w => onUpdate({ warnings: w })} customDims={sys.customDims} />
      </StepHeader>

      {/* ── Step 4: Variants ── */}
      <StepHeader step={STEPS[3]}>
        <VariantsPanel variants={sys.variants} onChange={v => onUpdate({ variants: v })} />
      </StepHeader>

      {/* ── Step 5: Custom Brackets ── */}
      <StepHeader step={STEPS[4]}>
        <CustomBracketsPanel
          customBrackets={sys.customBrackets ?? []}
          materials={sys.materials}
          libraryItems={library}
          customDims={sys.customDims ?? []}
          customCriteria={sys.customCriteria ?? []}
          variants={sys.variants ?? []}
          onChange={b => onUpdate({ customBrackets: b })}
          onAddFromLib={addFromLib}
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
        />
      </StepHeader>
    </div>

  </div>
  )
}
