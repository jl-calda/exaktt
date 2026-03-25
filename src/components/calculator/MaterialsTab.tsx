// src/components/calculator/MaterialsTab.tsx
'use client'
import { useState, useEffect } from 'react'
import type { MtoSystem, GlobalTag } from '@/types'
import type { Plan } from '@prisma/client'
import { useMaterialMutations } from '@/lib/hooks/useMaterialMutations'
import LibraryTab from './LibraryTab'
import MaterialsTable from './panels/MaterialsTable'
import CustomBracketsPanel from './panels/CustomBracketsPanel'

type SubTab = 'all' | 'library' | 'brackets'

interface Props {
  sys:         MtoSystem
  onUpdate:    (patch: Partial<MtoSystem>) => void
  globalTags:  GlobalTag[]
  onGoToSetup: () => void
  plan?:       Plan
  subTab?:     SubTab
}

export default function MaterialsTab({ sys, onUpdate, globalTags, plan = 'FREE', subTab: initialSubTab = 'all' }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(initialSubTab)
  const [library,           setLibrary]           = useState<any[]>([])
  const [labourRates,       setLabourRates]       = useState<any[]>([])
  const [workActivityRates, setWorkActivityRates] = useState<any[]>([])
  const [tagFilter,         setTagFilter]         = useState<string[]>([])

  useEffect(() => {
    fetch('/api/mto/library').then(r => r.json()).then(({ data }) => { if (data) setLibrary(data) })
    fetch('/api/mto/labour-rates').then(r => r.json()).then(({ data }) => { if (data) setLabourRates(data) })
    fetch('/api/mto/work-activity-rates').then(r => r.json()).then(({ data }) => { if (data) setWorkActivityRates(data) })
  }, [])

  const { saveMat, deleteMat, addMat, makeUnique, syncFromLib, addFromLib } =
    useMaterialMutations({ sys, library, onUpdate, syncLibrary: true })

  const toggleTag = (id: string) =>
    setTagFilter(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  const filteredMaterials = sys.materials.filter(m => {
    if (tagFilter.length > 0 && !tagFilter.some(tid => (m.tags ?? []).includes(tid))) return false
    return true
  })

  const SUB_TABS: { id: SubTab; label: string }[] = [
    { id: 'all',      label: 'Materials' },
    { id: 'brackets', label: 'Sub-assemblies' },
    { id: 'library',  label: 'Library' },
  ]

  return (
    <div>
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1 mb-4 border-b border-surface-200 pb-px">
        {SUB_TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveSubTab(id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border-b-2 transition-colors ${
              activeSubTab === id
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-100'
            }`}>
            {label}
            {id === 'brackets' && (sys.customBrackets ?? []).length > 0 && (
              <span className="ml-1.5 text-[10px] font-normal text-ink-faint">({(sys.customBrackets ?? []).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Filter bar — tag pills only, shown on All tab */}
      {activeSubTab === 'all' && globalTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-5">
          {globalTags.map(tag => {
            const active = tagFilter.includes(tag.id)
            return (
              <button key={tag.id} onClick={() => toggleTag(tag.id)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                  active
                    ? 'text-white shadow-sm'
                    : 'bg-white text-ink-muted border-surface-300 hover:border-surface-400 hover:text-ink'
                }`}
                style={active ? { background: tag.color ?? '#64748b', borderColor: 'transparent' } : {}}>
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: active ? 'rgba(255,255,255,0.6)' : (tag.color ?? '#94a3b8') }} />
                {tag.name}
              </button>
            )
          })}
        </div>
      )}

      {activeSubTab === 'all' && (
        <MaterialsTable
          inputModel={sys.inputModel}
          materials={filteredMaterials}
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
      )}

      {activeSubTab === 'brackets' && (
        <CustomBracketsPanel
          customBrackets={sys.customBrackets ?? []}
          materials={sys.materials}
          libraryItems={library}
          labourRates={labourRates}
          workActivityRates={workActivityRates}
          setupBracketIds={new Set((sys.setupBrackets ?? []).map(sb => sb.bracketId))}
          onChange={b => onUpdate({ customBrackets: b })}
          onAddFromLib={addFromLib}
        />
      )}

      {activeSubTab === 'library' && (
        <LibraryTab
          plan={plan}
          globalTags={globalTags}
          onAddToSystem={addFromLib}
        />
      )}
    </div>
  )
}
