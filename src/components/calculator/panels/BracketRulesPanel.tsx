// src/components/calculator/panels/BracketRulesPanel.tsx
'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { WorkBracket, Material, CustomDim, CustomCriterion, Variant } from '@/types'
import { InlineRuleEditor } from './MatRow'
import { Button } from '@/components/ui/Button'

interface Props {
  brackets:       WorkBracket[]
  customDims:     CustomDim[]
  customCriteria: CustomCriterion[]
  variants:       Variant[]
  onChange:        (brackets: WorkBracket[]) => void
}

export default function BracketRulesPanel({ brackets, customDims, customCriteria, variants, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(brackets.length === 1 ? brackets[0].id : null)

  if (brackets.length === 0) {
    return (
      <div className="border border-surface-200 bg-surface-50 overflow-hidden py-8 text-center" style={{ borderRadius: 'var(--radius-card)' }}>
        <p className="text-sm text-ink-faint">No sub-assemblies declared yet.</p>
        <p className="text-xs text-ink-faint mt-1">Define sub-assemblies in Materials → Sub-assemblies, then set their quantity rules here.</p>
      </div>
    )
  }

  const saveBracketRules = (bracketId: string, mat: Material) => {
    onChange(brackets.map(b =>
      b.id === bracketId
        ? { ...b, ruleSet: mat.ruleSet, criteriaKeys: mat.criteriaKeys, variantTags: mat.variantTags }
        : b
    ))
  }

  return (
    <div className="border border-surface-200 bg-surface-50 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
      <div className="px-5 py-3 border-b" style={{ background: 'var(--color-surface-100)', borderColor: 'var(--color-surface-200)' }}>
        <h3 className="font-semibold text-sm text-ink">Sub-assembly Quantity Rules</h3>
        <p className="text-xs text-ink-muted mt-0.5">Set how many of each sub-assembly are needed per job.</p>
      </div>

      <div className="divide-y divide-surface-200">
        {brackets.map(bracket => {
          const isExp = expandedId === bracket.id
          const hasRules = (bracket.ruleSet ?? []).some(r => r.ruleType)
          return (
            <div key={bracket.id}>
              <button
                onClick={() => setExpandedId(isExp ? null : bracket.id)}
                className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-surface-100 transition-colors"
              >
                <span className="text-lg flex-shrink-0">{bracket.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-ink">{bracket.name}</span>
                    {bracket.code && <span className="font-mono text-xs text-ink-faint">{bracket.code}</span>}
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

              {isExp && (
                <div className="px-5 pb-4 border-t border-surface-200">
                  <InlineRuleEditor
                    mat={{
                      id: bracket.id,
                      name: bracket.name,
                      unit: 'bracket',
                      ruleSet:      bracket.ruleSet      ?? [],
                      criteriaKeys: bracket.criteriaKeys ?? [],
                      variantTags:  bracket.variantTags  ?? {},
                      customDimKey: null,
                      notes: '', photo: null, productCode: '', category: '',
                      properties: {}, tags: [], substrate: 'all', libraryRef: null,
                      _libSyncedAt: null, _systemSpecific: false, _createdInSystem: null,
                      _createdAt: null, _updatedAt: null, _wasLibrary: null, _madeUniqueAt: null,
                    } as Material}
                    embedded
                    customDims={customDims}
                    customCriteria={customCriteria}
                    variants={variants}
                    onSave={m => saveBracketRules(bracket.id, m)}
                    onClose={() => {}}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
