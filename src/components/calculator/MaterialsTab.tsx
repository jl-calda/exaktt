// src/components/calculator/MaterialsTab.tsx
'use client'
import { useState, useEffect } from 'react'
import type { MtoSystem, GlobalTag } from '@/types'
import type { Plan } from '@prisma/client'
import { useMaterialMutations } from '@/lib/hooks/useMaterialMutations'
import LibraryTab from './LibraryTab'
import MaterialsTable from './panels/MaterialsTable'
import CustomBracketsPanel from './panels/CustomBracketsPanel'

type View = 'materials' | 'brackets' | 'library'

interface Props {
  sys:         MtoSystem
  onUpdate:    (patch: Partial<MtoSystem>) => void
  globalTags:  GlobalTag[]
  onGoToSetup: () => void
  plan?:       Plan
  view?:       View
}

export default function MaterialsTab({ sys, onUpdate, globalTags, plan = 'FREE', view = 'materials' }: Props) {
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

  return (
    <div>
      {/* Filter bar — tag pills only, shown on materials view */}
      {view === 'materials' && globalTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-5">
          {globalTags.map(tag => {
            const active = tagFilter.includes(tag.id)
            return (
              <button key={tag.id} onClick={() => toggleTag(tag.id)}
                className={`filter-pill ${active ? 'active' : ''}`}>
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: tag.color ?? '#94a3b8' }} />
                {tag.name}
              </button>
            )
          })}
        </div>
      )}

      {view === 'materials' && (
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

      {view === 'brackets' && (
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

      {view === 'library' && (
        <LibraryTab
          plan={plan}
          globalTags={globalTags}
          onAddToSystem={addFromLib}
        />
      )}
    </div>
  )
}
