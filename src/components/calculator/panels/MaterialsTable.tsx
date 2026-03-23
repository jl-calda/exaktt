// src/components/calculator/panels/MaterialsTable.tsx
'use client'
import { useState } from 'react'
import type { Material, CustomDim, CustomCriterion, Variant, GlobalTag, WorkBracket } from '@/types'
import { PRIMITIVE_DIMS } from '@/lib/engine/constants'
import { Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import MatRow from './MatRow'
import MaterialSearchCombobox from './MaterialSearchCombobox'
import AddMaterialModal from './AddMaterialModal'

interface Props {
  materials:       Material[]
  customDims:      CustomDim[]
  customCriteria:  CustomCriterion[]
  variants:        Variant[]
  globalTags:      GlobalTag[]
  library:         any[]
  customBrackets?: WorkBracket[]
  onSave:          (m: Material) => void
  onDelete:        (id: string) => void
  onMakeUnique:    (id: string) => void
  onSyncFromLib:   (id: string) => void
  onAddFromLib:    (libMat: any) => void
  sysId:           string
}

export default function MaterialsTable({
  materials, customDims, customCriteria, variants, globalTags,
  library, customBrackets = [], onSave, onDelete, onMakeUnique, onSyncFromLib, onAddFromLib,
}: Props) {
  const [search,       setSearch]       = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const allDims = [...PRIMITIVE_DIMS, ...customDims]

  const visible = materials.filter(m => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Material IDs used as bracket BOM components
  const bracketMatIds = new Set(
    customBrackets.flatMap(b => (b.bom ?? []).map(item => item.materialId).filter(Boolean))
  )
  // Bracket-only = no rule AND is a bracket BOM item (intentionally rule-free)
  const bracketOnlyIds = new Set(
    materials.filter(m => !(m.ruleSet ?? []).some(r => r.ruleType) && bracketMatIds.has(m.id)).map(m => m.id)
  )

  const unassigned = materials.filter(m =>
    !(m.ruleSet ?? []).some(r => r.ruleType) && !bracketOnlyIds.has(m.id)
  )

  return (
    <div className="border border-surface-200 bg-surface-50 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
      {/* Toolbar */}
      <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ background: 'var(--color-surface-100)', borderColor: 'var(--color-surface-200)' }}>
        <div>
          <div className="font-semibold text-sm text-ink">
            Materials ({materials.length})
            {unassigned.length > 0 && (
              <span className="ml-2 badge bg-amber-50 text-amber-700 text-[10px]">⚠ {unassigned.length} unassigned</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Filter…" className="input text-xs py-1.5 pl-8 w-32" />
          </div>
          <MaterialSearchCombobox library={library} onAddFromLib={onAddFromLib} />
          <Button size="sm" onClick={() => setShowAddModal(true)} icon={<Plus className="w-3.5 h-3.5" />}>Add Material</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface-100 border-b border-surface-200">
              <th className="px-3 py-2.5 w-14"></th>
              <th className="text-left px-4 py-2.5 font-semibold text-ink-muted text-xs uppercase tracking-wide min-w-52">Material</th>
              <th className="text-left px-3 py-2.5 font-semibold text-ink-muted text-xs uppercase tracking-wide w-20">Unit</th>
              <th className="text-left px-3 py-2.5 font-semibold text-ink-muted text-xs uppercase tracking-wide">Rule</th>
              <th className="px-3 py-2.5 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-ink-faint">
                {materials.length === 0
                  ? 'No materials yet — search above to add from your library.'
                  : 'No materials match your filter.'}
              </td></tr>
            )}
            {visible.map((mat, i) => (
              <MatRow key={mat.id} mat={mat} rowIndex={i}
                onSave={onSave} onDelete={onDelete}
                customDims={customDims} customCriteria={customCriteria} variants={variants}
                globalTags={globalTags} allDims={allDims}
                library={library} onMakeUnique={onMakeUnique} onSyncFromLib={onSyncFromLib}
                isBracketMaterial={bracketOnlyIds.has(mat.id)} />
            ))}
          </tbody>
        </table>
      </div>

      <AddMaterialModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddFromLib={onAddFromLib}
      />
    </div>
  )
}
