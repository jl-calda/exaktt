// src/components/calculator/panels/BracketRulesPanel.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Search, Trash2, Plus } from 'lucide-react'
import type { WorkBracket, SetupBracket, SetupBracketParam, Material, CustomDim, CustomCriterion, Variant } from '@/types'
import { InlineRuleEditor } from './MatRow'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface Props {
  templates:      WorkBracket[]         // all declared sub-assemblies (from Materials)
  setupBrackets:  SetupBracket[]        // sub-assemblies added to setup
  materials:      Material[]            // system materials (for stock_length picker)
  customDims:     CustomDim[]
  customCriteria: CustomCriterion[]
  variants:       Variant[]
  onChange:        (setupBrackets: SetupBracket[]) => void
}

/* ── Jump-to dropdown (searches active brackets) ────────────────────────────── */
function BracketDropdown({
  items,
  expandedId,
  onSelect,
}: {
  items:      { template: WorkBracket; setup: SetupBracket }[]
  expandedId: string | null
  onSelect:   (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const q = query.toLowerCase().trim()
  const filtered = q
    ? items.filter(i => i.template.name.toLowerCase().includes(q) || (i.template.code ?? '').toLowerCase().includes(q))
    : items

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Jump to sub-assembly\u2026"
          autoComplete="off"
          className="input text-xs py-1.5 pl-8 pr-3 w-52"
        />
      </div>

      {open && filtered.length > 0 && (
        <ul
          className="absolute z-50 top-full mt-1 right-0 w-64 bg-surface-50 border border-surface-200 shadow-float max-h-52 overflow-y-auto py-1"
          style={{ borderRadius: 'var(--radius-card)' }}
        >
          {filtered.map(({ template: b, setup: sb }) => {
            const hasRules = (sb.ruleSet ?? []).some(r => r.ruleType)
            const isActive = expandedId === b.id
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); onSelect(b.id); setQuery(''); setOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left ${isActive ? 'bg-primary/5' : 'hover:bg-surface-100'}`}
                >
                  <span className="text-base flex-shrink-0">{b.icon}</span>
                  <span className="flex-1 font-medium text-ink truncate">{b.name}</span>
                  {hasRules ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-primary" style={{ background: 'var(--color-primary-50, #eff6ff)' }}>rules</span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-amber-700 bg-amber-50">no rules</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {open && filtered.length === 0 && q && (
        <div
          className="absolute z-50 top-full mt-1 right-0 w-64 bg-surface-50 border border-surface-200 shadow-float py-3 px-3 text-xs text-ink-faint italic text-center"
          style={{ borderRadius: 'var(--radius-card)' }}
        >
          No matching sub-assemblies
        </div>
      )}
    </div>
  )
}

/* ── Add-to-setup dropdown (shows available templates) ──────────────────────── */
function AddBracketDropdown({
  available,
  onAdd,
}: {
  available: WorkBracket[]
  onAdd:     (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (available.length === 0) return null

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" />
        Add to Setup
      </button>

      {open && (
        <ul
          className="absolute z-50 top-full mt-1 right-0 w-64 bg-surface-50 border border-surface-200 shadow-float max-h-52 overflow-y-auto py-1"
          style={{ borderRadius: 'var(--radius-card)' }}
        >
          {available.map(b => (
            <li key={b.id}>
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault()
                  onAdd(b.id)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left hover:bg-surface-100"
              >
                <span className="text-base flex-shrink-0">{b.icon}</span>
                <span className="flex-1 font-medium text-ink truncate">{b.name}</span>
                {b.code && <span className="font-mono text-[10px] text-ink-faint">{b.code}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Parameter configuration (source, value, min/max) ───────────────────────── */
function ParameterConfig({
  template,
  setupParams,
  materials,
  onUpdate,
}: {
  template:    WorkBracket
  setupParams: SetupBracketParam[]
  materials:   Material[]
  onUpdate:    (params: SetupBracketParam[]) => void
}) {
  if (!template.parameters?.length) return null

  const spMap = new Map(setupParams.map(sp => [sp.key, sp]))

  const updateParam = (key: string, patch: Partial<SetupBracketParam>) => {
    const updated = template.parameters.map(p => {
      const existing = spMap.get(p.key) ?? {
        key: p.key, source: p.source ?? 'input', value: p.default ?? 0,
        min: p.min, max: p.max, stockMaterialId: p.stockMaterialId,
      }
      return p.key === key ? { ...existing, ...patch } : existing
    })
    onUpdate(updated)
  }

  return (
    <div className="mb-3">
      <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide mb-2">Parameters</div>
      <div className="flex flex-col gap-2">
        {template.parameters.map(p => {
          const sp = spMap.get(p.key) ?? {
            key: p.key, source: p.source ?? 'input', value: p.default ?? 0,
            min: p.min, max: p.max, stockMaterialId: p.stockMaterialId,
          }
          const isStock = sp.source === 'stock_length'

          return (
            <div key={p.key} className="rounded border border-surface-200 bg-surface-50 px-3 py-2" style={{ borderRadius: 'var(--radius)' }}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-ink min-w-[80px]">{p.label}</span>
                <select
                  value={sp.source}
                  onChange={e => updateParam(p.key, { source: e.target.value as 'input' | 'stock_length' })}
                  className="input text-xs py-1 px-2 w-32"
                >
                  <option value="input">Input</option>
                  <option value="stock_length">Stock Length</option>
                </select>

                {isStock ? (
                  <select
                    value={sp.stockMaterialId ?? ''}
                    onChange={e => updateParam(p.key, { stockMaterialId: e.target.value })}
                    className="input text-xs py-1 px-2 flex-1 min-w-[140px]"
                  >
                    <option value="">— select material —</option>
                    {materials.filter(m => m.spec?.stockLengthMm).map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.spec!.stockLengthMm}mm)</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <label className="flex items-center gap-1">
                      <span className="text-[10px] text-ink-faint">Value</span>
                      <input
                        type="number"
                        value={sp.value}
                        min={sp.min}
                        max={sp.max}
                        step="any"
                        onChange={e => {
                          const val = parseFloat(e.target.value)
                          if (!isNaN(val)) updateParam(p.key, { value: val })
                        }}
                        className="input text-xs py-1 px-2 w-16"
                      />
                      {p.unit && <span className="text-[10px] text-ink-faint">{p.unit}</span>}
                    </label>
                    <span className="text-[10px] text-ink-faint/60 mx-1">|</span>
                    <label className="flex items-center gap-1" title="Allowed input range per project">
                      <span className="text-[10px] text-ink-faint">Range</span>
                      <input
                        type="number"
                        value={sp.min ?? ''}
                        step="any"
                        placeholder="min"
                        onChange={e => {
                          const val = e.target.value ? parseFloat(e.target.value) : undefined
                          updateParam(p.key, { min: val })
                        }}
                        className="input text-xs py-1 px-2 w-14"
                      />
                      <span className="text-[10px] text-ink-faint">–</span>
                      <input
                        type="number"
                        value={sp.max ?? ''}
                        step="any"
                        placeholder="max"
                        onChange={e => {
                          const val = e.target.value ? parseFloat(e.target.value) : undefined
                          updateParam(p.key, { max: val })
                        }}
                        className="input text-xs py-1 px-2 w-14"
                      />
                      {p.unit && <span className="text-[10px] text-ink-faint">{p.unit}</span>}
                    </label>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main panel ─────────────────────────────────────────────────────────────── */
export default function BracketRulesPanel({ templates, setupBrackets, materials, customDims, customCriteria, variants, onChange }: Props) {
  const templateMap = new Map(templates.map(t => [t.id, t]))
  const setupIds    = new Set(setupBrackets.map(sb => sb.bracketId))
  const available   = templates.filter(t => !setupIds.has(t.id))

  // Pair each setup bracket with its template
  const active = setupBrackets
    .map(sb => ({ template: templateMap.get(sb.bracketId)!, setup: sb }))
    .filter(pair => pair.template)

  const [expandedId, setExpandedId] = useState<string | null>(active.length === 1 ? active[0]?.template.id ?? null : null)
  const [removeId,   setRemoveId]   = useState<string | null>(null)

  const addToSetup = (bracketId: string) => {
    const tmpl = templateMap.get(bracketId)
    if (!tmpl) return
    // Create SetupBracket with defaults from template parameters
    const params: SetupBracketParam[] = (tmpl.parameters ?? []).map(p => ({
      key:             p.key,
      source:          p.source ?? 'input',
      value:           p.default ?? 0,
      min:             p.min,
      max:             p.max,
      stockMaterialId: p.stockMaterialId,
    }))
    onChange([...setupBrackets, { bracketId, params, ruleSet: [], criteriaKeys: [], variantTags: {} }])
    setExpandedId(bracketId)
  }

  const removeFromSetup = (bracketId: string) => {
    onChange(setupBrackets.filter(sb => sb.bracketId !== bracketId))
    if (expandedId === bracketId) setExpandedId(null)
    setRemoveId(null)
  }

  const updateSetupBracket = (bracketId: string, patch: Partial<SetupBracket>) => {
    onChange(setupBrackets.map(sb =>
      sb.bracketId === bracketId ? { ...sb, ...patch } : sb
    ))
  }

  const saveBracketRules = (bracketId: string, mat: Material) => {
    updateSetupBracket(bracketId, {
      ruleSet:      mat.ruleSet,
      criteriaKeys: mat.criteriaKeys,
      variantTags:  mat.variantTags,
    })
  }

  return (
    <div className="border border-surface-200 bg-surface-50 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
      <div className="px-5 py-3 border-b flex items-center justify-between gap-3" style={{ background: 'var(--color-surface-100)', borderColor: 'var(--color-surface-200)' }}>
        <div>
          <h3 className="font-semibold text-sm text-ink">Sub-assembly Quantity Rules</h3>
          <p className="text-xs text-ink-muted mt-0.5">Select sub-assemblies, configure parameters, and set quantity rules.</p>
        </div>
        <div className="flex items-center gap-2">
          <AddBracketDropdown available={available} onAdd={addToSetup} />
          {active.length > 1 && (
            <BracketDropdown items={active} expandedId={expandedId} onSelect={id => setExpandedId(expandedId === id ? null : id)} />
          )}
        </div>
      </div>

      {active.length === 0 && (
        <div className="py-8 text-center">
          {templates.length === 0 ? (
            <>
              <p className="text-sm text-ink-faint">No sub-assemblies defined.</p>
              <p className="text-xs text-ink-faint mt-1">Define sub-assemblies in the Materials &rarr; Sub-assemblies tab.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-faint">No sub-assemblies added to setup.</p>
              <p className="text-xs text-ink-faint mt-1">Use the &ldquo;Add to Setup&rdquo; button to include sub-assemblies.</p>
            </>
          )}
        </div>
      )}

      <div className="divide-y divide-surface-200">
        {active.map(({ template, setup }) => {
          const isExp = expandedId === template.id
          const hasRules = (setup.ruleSet ?? []).some(r => r.ruleType)
          return (
            <div key={template.id} className="relative">
              <button
                onClick={() => setExpandedId(isExp ? null : template.id)}
                className="w-full px-5 py-3 pr-10 flex items-center gap-3 text-left hover:bg-surface-100 transition-colors"
              >
                <span className="text-lg flex-shrink-0">{template.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-ink">{template.name}</span>
                    {template.code && <span className="font-mono text-xs text-ink-faint">{template.code}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {hasRules ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-primary" style={{ background: 'var(--color-primary-50, #eff6ff)' }}>rule-driven qty</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-amber-700 bg-amber-50">no qty rule</span>
                    )}
                  </div>
                </div>
                {isExp ? <ChevronUp className="w-4 h-4 text-ink-faint" /> : <ChevronDown className="w-4 h-4 text-ink-faint" />}
              </button>
              <button
                onClick={e => { e.stopPropagation(); setRemoveId(template.id) }}
                className="absolute right-3 top-3 p-1 rounded text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Remove from setup"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {isExp && (
                <div className="px-5 pb-4 border-t border-surface-200">
                  <div className="pt-3">
                    <ParameterConfig
                      template={template}
                      setupParams={setup.params}
                      materials={materials}
                      onUpdate={params => updateSetupBracket(template.id, { params })}
                    />
                  </div>
                  <InlineRuleEditor
                    mat={{
                      id: template.id,
                      name: template.name,
                      unit: 'bracket',
                      ruleSet:      setup.ruleSet      ?? [],
                      criteriaKeys: setup.criteriaKeys ?? [],
                      variantTags:  setup.variantTags  ?? {},
                      customDimKey: null,
                      notes: '', photo: null, productCode: '', category: '',
                      properties: {}, tags: [], substrate: 'all', libraryRef: null,
                      _libSyncedAt: null, _systemSpecific: false, _createdInSystem: null,
                      _createdAt: null, _updatedAt: null, _wasLibrary: null, _madeUniqueAt: null,
                    } as Material}
                    embedded
                    hideCondition
                    customDims={customDims}
                    customCriteria={customCriteria}
                    variants={variants}
                    onSave={m => saveBracketRules(template.id, m)}
                    onClose={() => {}}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <ConfirmModal
        open={removeId !== null}
        title="Remove from setup?"
        message="This sub-assembly will be removed from setup. The template will remain in the Materials tab and can be re-added later."
        onConfirm={() => removeId && removeFromSetup(removeId)}
        onCancel={() => setRemoveId(null)}
      />
    </div>
  )
}
