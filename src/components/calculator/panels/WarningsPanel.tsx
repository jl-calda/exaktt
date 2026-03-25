// src/components/calculator/panels/WarningsPanel.tsx
'use client'
import { useState } from 'react'
import type { Warning, CustomDim } from '@/types'
import { PRIMITIVE_DIMS, DIMS_FOR_INPUT_MODEL, getDimLabel, getDimUnit } from '@/lib/engine/constants'
import type { DimOverride } from '@/lib/engine/constants'
import { nanoid } from 'nanoid'
import { Plus, Trash2, Edit3, Check, X, AlertTriangle, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Input, NumberInput } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import FloatingPanel from '../FloatingPanel'

interface Props {
  warnings:   Warning[]
  customDims: CustomDim[]
  onChange:   (warnings: Warning[]) => void
  inputModel?: string
  dimOverrides?:  Record<string, { label?: string; unit?: string }>
}

const OPS   = [{ value: '>', label: '>' }, { value: '>=', label: '≥' }, { value: '<', label: '<' }, { value: '<=', label: '≤' }]
const BLANK = { dimKey: 'length', operator: '>' as const, threshold: 0, message: '' }

const WARNING_HELP = {
  title: 'Threshold warning',
  formula: 'shown when: dimension operator threshold',
  example: 'height > 9000 → "Changing flight required above 9 m"',
}

const WARNING_FIELD_ITEMS = [
  { label: 'Dimension', desc: 'The input or custom dim whose value triggers the warning.' },
  { label: 'Operator & Threshold', desc: 'The condition — e.g. > 9000 means "when value exceeds 9000".' },
  { label: 'Warning message', desc: 'Text shown to the user in the calculator when the condition is met.' },
]

function FieldGuide() {
  return (
    <div className="bg-surface-100 border border-surface-200 px-4 py-3 animate-fade-in"
      style={{ borderRadius: 'var(--radius)' }}>
      <div className="mb-3 pb-3 border-b border-surface-200">
        <div className="text-xs font-semibold text-ink mb-0.5">{WARNING_HELP.title}</div>
        <div className="font-mono text-[11px] text-primary mb-1">{WARNING_HELP.formula}</div>
        <div className="text-[10px] text-ink-faint italic">{WARNING_HELP.example}</div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {WARNING_FIELD_ITEMS.map(item => (
          <div key={item.label} className="min-w-[200px] flex-1">
            <div className="text-xs font-semibold text-ink mb-0.5">{item.label}</div>
            <div className="text-[10px] text-ink-faint italic leading-snug">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface WarnFormProps {
  dimOptions: { value: string; label: string; group: string }[]
  d:          typeof BLANK | Warning
  onField:    (k: string, v: any) => void
  onSubmit:   () => void
  onCancel:   () => void
  submitLabel: string
  dimOverrides?: Record<string, DimOverride>
  customDims:   CustomDim[]
}

function WarnForm({ dimOptions, d, onField, onSubmit, onCancel, submitLabel, dimOverrides, customDims }: WarnFormProps) {
  const [guideOpen, setGuideOpen] = useState(false)
  const customDim = customDims.find(cd => cd.key === d.dimKey)
  const resolvedUnit = customDim ? customDim.unit : getDimUnit(d.dimKey, dimOverrides)
  return (
    <div className="space-y-3">
      <div className="flex-1 min-w-0 space-y-4">
        {/* Row 1: condition */}
        <div className="flex flex-wrap gap-4 items-start">
          <Select label="Dimension" value={d.dimKey}
            onChange={e => onField('dimKey', e.target.value)}
            options={dimOptions}
            className="w-52" />
          <Select label="Operator" value={d.operator}
            onChange={e => onField('operator', e.target.value)}
            options={OPS} className="w-20" />
          <NumberInput label="Threshold" value={d.threshold} step="any" min={0}
            onChange={e => onField('threshold', parseFloat(e.target.value))} unit={resolvedUnit} className="w-28" />
        </div>
        {/* Row 2: message */}
        <div className="flex flex-wrap gap-4 items-start">
          <Input label="Warning message" value={d.message}
            onChange={e => onField('message', e.target.value)}
            placeholder="e.g. Changing flight required above 9000mm" className="w-96" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="primary"   onClick={onSubmit} icon={<Check className="w-3.5 h-3.5" />}>{submitLabel}</Button>
          <Button size="sm" variant="secondary" onClick={onCancel} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
        </div>
      </div>
      {/* Field Guide: inline on xl+, floating on small screens */}
      <div className="hidden xl:block">
        <FieldGuide />
      </div>
      <div className="xl:hidden">
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
    </div>
  )
}

export default function WarningsPanel({ warnings, customDims, onChange, inputModel, dimOverrides }: Props) {
  const [adding,    setAdding]    = useState(false)
  const [draft,     setDraft]     = useState({ ...BLANK })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Warning | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  const allDims = [...PRIMITIVE_DIMS, ...customDims]

  const allowedKeys = new Set(DIMS_FOR_INPUT_MODEL[inputModel ?? ''] ?? PRIMITIVE_DIMS.map(p => p.key))
  const filteredPrims = PRIMITIVE_DIMS.filter(p => allowedKeys.has(p.key))

  const dimOptions = [
    ...filteredPrims.map(p => ({ value: p.key, label: p.icon + ' ' + getDimLabel(p.key, dimOverrides), group: 'Primitive' })),
    ...customDims.flatMap(cd => {
      const base = { value: cd.key, label: (cd.icon ?? '🔗') + ' ' + cd.name + ' — computed count (' + cd.unit + ')', group: 'Custom Dimensions' }
      if (cd.derivType === 'spacing' && cd.spacingMode === 'user') {
        return [
          base,
          { value: '__spacing_' + cd.key, label: (cd.icon ?? '🔗') + ' ' + cd.name + ' — spacing input (m)', group: 'Custom Dimensions' },
        ]
      }
      return [base]
    }),
  ]

  const add = () => {
    if (!draft.message.trim()) return
    const key = draft.dimKey + '_warn_' + Math.random().toString(36).slice(2, 5)
    onChange([...warnings, { ...draft, id: nanoid(), key }])
    setDraft({ ...BLANK }); setAdding(false)
  }

  const remove     = (id: string) => onChange(warnings.filter(w => w.id !== id))
  const startEdit  = (w: Warning) => { setEditingId(w.id ?? null); setEditDraft({ ...w }); setAdding(false) }
  const cancelEdit = () => { setEditingId(null); setEditDraft(null) }
  const saveEdit   = () => {
    if (!editDraft?.message.trim()) return
    onChange(warnings.map(w => w.id === editingId ? { ...editDraft } : w))
    cancelEdit()
  }

  return (
    <div className="border border-surface-200 bg-surface-50 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'var(--color-surface-100)', borderColor: 'var(--color-surface-200)' }}>
        <div>
          <h3 className="font-semibold text-sm text-ink">⚠️ Threshold Warnings</h3>
          <p className="text-xs text-ink-muted mt-0.5">Dimension thresholds that trigger visible warnings in the calculator.</p>
        </div>
        <Button size="sm" onClick={() => setAdding(v => !v)} icon={<Plus className="w-3.5 h-3.5" />}>Add Warning</Button>
      </div>

      {adding && (
        <div className="p-5 bg-surface-100 border-b border-surface-200">
          <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-4">New Warning</div>
          <WarnForm
            dimOptions={dimOptions} d={draft}
            onField={(k, v) => setDraft(d => ({ ...d, [k]: v }))}
            onSubmit={add} onCancel={() => setAdding(false)} submitLabel="Add"
            dimOverrides={dimOverrides} customDims={customDims}
          />
        </div>
      )}

      {warnings.length === 0 && !adding && (
        <div className="py-10 text-center text-sm text-ink-faint">
          No warnings defined. Example: height &gt; 9000mm → changing flight required.
        </div>
      )}

      <div className="divide-y divide-surface-200">
        {warnings.map(w => {
          const isEd           = editingId === w.id
          const isSpacingInput = w.dimKey.startsWith('__spacing_')
          const cdKey          = isSpacingInput ? w.dimKey.replace('__spacing_', '') : w.dimKey
          const dimInfo        = allDims.find(d => d.key === cdKey)
          return (
            <div key={w.id} className={isEd ? 'bg-primary/5' : ''}>
              <div className="px-5 py-3 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-amber-700 font-semibold mb-0.5">
                    {PRIMITIVE_DIMS.some(p => p.key === cdKey) ? getDimLabel(cdKey, dimOverrides) : (dimInfo as any)?.name ?? cdKey}
                    {isSpacingInput ? ' spacing' : ''} {w.operator} {w.threshold}
                  </div>
                  <div className="text-sm text-ink">{w.message}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="xs" variant={isEd ? 'primary' : 'ghost'}
                    onClick={() => isEd ? cancelEdit() : startEdit(w)}
                    icon={<Edit3 className="w-3 h-3" />}>
                    {isEd ? 'Cancel' : 'Edit'}
                  </Button>
                  <Button size="xs" variant="danger" onClick={() => setDeleteId(w.id!)} icon={<Trash2 className="w-3 h-3" />} />
                </div>
              </div>
              {isEd && editDraft && (
                <div className="px-5 pb-5 border-t border-primary/20 pt-4">
                  <WarnForm
                    dimOptions={dimOptions} d={editDraft}
                    onField={(k, v) => setEditDraft(d => d ? { ...d, [k]: v } : d)}
                    onSubmit={saveEdit} onCancel={cancelEdit} submitLabel="Save"
                    dimOverrides={dimOverrides} customDims={customDims}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <ConfirmModal
        open={deleteId !== null}
        title="Delete warning?"
        message="This threshold warning will be permanently removed."
        onConfirm={() => { remove(deleteId!); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
