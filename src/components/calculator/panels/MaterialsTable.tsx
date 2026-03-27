// src/components/calculator/panels/MaterialsTable.tsx
'use client'
import { useState } from 'react'
import type { Material, CustomDim, CustomCriterion, Variant, GlobalTag, WorkBracket, InputModel } from '@/types'
import { PRIMITIVE_DIMS, MATERIAL_GROUPS } from '@/lib/engine/constants'
import { Search, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import MatRow from './MatRow'
import type { MatBadge } from './MatRow'
import MaterialSearchCombobox from './MaterialSearchCombobox'
import AddMaterialModal from './AddMaterialModal'

interface Props {
  inputModel:      InputModel
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
  inputModel, materials, customDims, customCriteria, variants, globalTags,
  library, customBrackets = [], onSave, onDelete, onMakeUnique, onSyncFromLib, onAddFromLib,
}: Props) {
  const [search,       setSearch]       = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [collapsed,    setCollapsed]    = useState<Set<string>>(new Set())

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

  // Plate-driven material IDs (auto-qty from sheet_cut solver)
  const plateMaterialIds = new Set(
    customDims.filter(cd => cd.derivType === 'sheet_cut' && cd.plateMaterialId).map(cd => cd.plateMaterialId)
  )

  // Bracket source names per material
  const bracketSourceMap = new Map<string, string[]>()
  for (const b of customBrackets) {
    for (const item of b.bom ?? []) {
      if (!item.materialId) continue
      const arr = bracketSourceMap.get(item.materialId) ?? []
      arr.push(b.name)
      bracketSourceMap.set(item.materialId, arr)
    }
  }

  // Badge for each material
  function getBadge(mat: Material): MatBadge | undefined {
    if (bracketOnlyIds.has(mat.id)) {
      const sources = bracketSourceMap.get(mat.id) ?? []
      return { type: 'bracket', label: sources.length ? `via ${sources.join(', ')}` : 'Sub-assembly BOM' }
    }
    if (plateMaterialIds.has(mat.id)) return { type: 'plate', label: 'Auto' }
    if ((mat.ruleSet ?? []).some(r => r.ruleType === 'stock_length_qty')) return { type: 'solver', label: 'Solver' }
    if (!(mat.ruleSet ?? []).some(r => r.ruleType)) return { type: 'unassigned', label: 'No rule' }
    return undefined
  }

  // Split into two groups
  const matGroup    = visible.filter(m => !bracketOnlyIds.has(m.id))
  const subAsmGroup = visible.filter(m => bracketOnlyIds.has(m.id))

  const unassigned = materials.filter(m =>
    !(m.ruleSet ?? []).some(r => r.ruleType) && !bracketOnlyIds.has(m.id)
  )

  const toggleSection = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const groupMeta = MATERIAL_GROUPS

  const renderSection = (groupId: string, items: Material[]) => {
    if (items.length === 0) return null
    const meta = groupMeta.find(g => g.id === groupId)!
    const isCollapsed = collapsed.has(groupId)
    const Chevron = isCollapsed ? ChevronRight : ChevronDown
    return (
      <tbody key={groupId}>
        <tr
          className="group-header"
          onClick={() => toggleSection(groupId)}
        >
          <td colSpan={5} style={{ borderLeft: `3px solid ${meta.color}` }}>
            <div className="flex items-center gap-2">
              <Chevron className="w-3.5 h-3.5 text-ink-muted" />
              <span className="font-semibold text-xs text-ink">{meta.label}</span>
              <span className="text-[10px] text-ink-faint">({items.length})</span>
              <span className="text-[10px] text-ink-faint ml-1">{meta.desc}</span>
            </div>
          </td>
        </tr>
        {!isCollapsed && items.map((mat, i) => (
          <MatRow key={mat.id} mat={mat} rowIndex={i}
            inputModel={inputModel}
            onSave={onSave} onDelete={onDelete}
            customDims={customDims} customCriteria={customCriteria} variants={variants}
            globalTags={globalTags} allDims={allDims}
            library={library} onMakeUnique={onMakeUnique} onSyncFromLib={onSyncFromLib}
            isBracketMaterial={bracketOnlyIds.has(mat.id)}
            badge={getBadge(mat)} />
        ))}
      </tbody>
    )
  }

  return (
    <div className="table-wrap">
      {/* Toolbar */}
      <div className="card-header flex-wrap gap-3">
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
        <table>
          <thead>
            <tr>
              <th className="w-14"></th>
              <th className="min-w-52">Material</th>
              <th className="w-20">Unit</th>
              <th>Rule</th>
              <th className="w-28"></th>
            </tr>
          </thead>
          {visible.length === 0 ? (
            <tbody>
              <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-ink-faint">
                {materials.length === 0
                  ? 'No materials yet — search above to add from your library.'
                  : 'No materials match your filter.'}
              </td></tr>
            </tbody>
          ) : (
            <>
              {renderSection('materials', matGroup)}
              {renderSection('subassembly', subAsmGroup)}
            </>
          )}
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
