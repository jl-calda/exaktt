import { nanoid } from 'nanoid'
import type { MtoSystem, Material } from '@/types'

interface UseMaterialMutationsOpts {
  sys: MtoSystem
  library: any[]
  onUpdate: (patch: Partial<MtoSystem>) => void
  syncLibrary?: boolean
}

// Best-effort library sync — intentionally fire-and-forget.
// The .catch() prevents unhandled rejection warnings.
function librarySync(action: string, id: string, sysId: string) {
  fetch('/api/mto/library', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, id, sysId }),
  }).catch(() => {})
}

export function useMaterialMutations({ sys, library, onUpdate, syncLibrary = false }: UseMaterialMutationsOpts) {
  const saveMat = (updated: Material) =>
    onUpdate({ materials: sys.materials.map(m => m.id === updated.id ? { ...updated, _updatedAt: Date.now() } : m) })

  const deleteMat = (id: string) => {
    if (!confirm('Delete this material?')) return
    const mat = sys.materials.find(m => m.id === id)
    onUpdate({ materials: sys.materials.filter(m => m.id !== id) })
    if (syncLibrary && mat?.libraryRef) {
      librarySync('removeSystem', mat.libraryRef, sys.id)
    }
  }

  const addMat = (mat: Material) =>
    onUpdate({ materials: [...sys.materials, mat] })

  const makeUnique = (id: string) => {
    const mat = sys.materials.find(m => m.id === id)
    onUpdate({ materials: sys.materials.map(m =>
      m.id === id ? { ...m, libraryRef: null, _madeUniqueAt: Date.now(), _systemSpecific: true } : m
    )})
    if (syncLibrary && mat?.libraryRef) {
      librarySync('removeSystem', mat.libraryRef, sys.id)
    }
  }

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
      spec: libItem.spec ?? null, ruleSet: [],
      criteriaKeys: [], variantTags: {}, libraryRef: libItem.id,
      _libSyncedAt: Date.now(), _createdAt: Date.now(), _updatedAt: Date.now(),
      substrate: 'all', _systemSpecific: false, _createdInSystem: null,
      _wasLibrary: null, _madeUniqueAt: null,
    }
    onUpdate({ materials: [...sys.materials, newMat] })
    if (syncLibrary) {
      librarySync('addSystem', libItem.id, sys.id)
    }
  }

  return { saveMat, deleteMat, addMat, makeUnique, syncFromLib, addFromLib }
}
