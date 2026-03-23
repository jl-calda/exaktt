// src/store/index.ts
// Central Zustand store — replaces all useState in the single-file artifact
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MtoSystem, SavedJob, LibraryItem, GlobalTag, Run } from '@/types'
import { nanoid } from 'nanoid'

// ─── System store ─────────────────────────────────────────────────────────────

interface SystemStore {
  systems:      MtoSystem[]
  activeSysId:  string | null

  setSystems:   (s: MtoSystem[]) => void
  addSystem:    (s: MtoSystem) => void
  updateSystem: (id: string, patch: Partial<MtoSystem>) => void
  removeSystem: (id: string) => void
  setActive:    (id: string | null) => void

  // Material helpers
  saveMat:   (sysId: string, mat: any) => void
  deleteMat: (sysId: string, matId: string) => void
  addMat:    (sysId: string, mat: any) => void
}

export const useMtoStore = create<SystemStore>()(
  persist(
    (set) => ({
      systems:     [],
      activeSysId: null,

      setSystems:   (systems) => set({ systems }),
      addSystem:    (s) => set(st => ({ systems: [...st.systems, s] })),
      updateSystem: (id, patch) => set(st => ({
        systems: st.systems.map(s => s.id === id ? { ...s, ...patch } : s),
      })),
      removeSystem: (id) => set(st => ({
        systems: st.systems.filter(s => s.id !== id),
        activeSysId: st.activeSysId === id ? null : st.activeSysId,
      })),
      setActive: (id) => set({ activeSysId: id }),

      saveMat: (sysId, mat) => set(st => ({
        systems: st.systems.map(s => s.id !== sysId ? s : {
          ...s,
          materials: s.materials.map(m => m.id === mat.id ? { ...mat, _updatedAt: Date.now() } : m),
        }),
      })),
      deleteMat: (sysId, matId) => set(st => ({
        systems: st.systems.map(s => s.id !== sysId ? s : {
          ...s, materials: s.materials.filter(m => m.id !== matId),
        }),
      })),
      addMat: (sysId, mat) => set(st => ({
        systems: st.systems.map(s => s.id !== sysId ? s : {
          ...s, materials: [...s.materials, mat],
        }),
      })),
    }),
    { name: 'mto-systems' }
  )
)

// ─── Library store ────────────────────────────────────────────────────────────

interface LibraryStore {
  items: LibraryItem[]
  setItems:   (items: LibraryItem[]) => void
  addItem:    (item: LibraryItem) => void
  updateItem: (id: string, patch: Partial<LibraryItem>) => void
  removeItem: (id: string) => void
}

export const useLibraryStore = create<LibraryStore>()(
  persist(
    (set) => ({
      items: [],
      setItems:   (items) => set({ items }),
      addItem:    (item)  => set(st => ({ items: [item, ...st.items] })),
      updateItem: (id, patch) => set(st => ({
        items: st.items.map(i => i.id === id ? { ...i, ...patch, updatedAt: new Date() } : i),
      })),
      removeItem: (id) => set(st => ({ items: st.items.filter(i => i.id !== id) })),
    }),
    { name: 'mto-library' }
  )
)

// ─── Global tags store ────────────────────────────────────────────────────────

interface TagsStore {
  tags: GlobalTag[]
  setTags:   (tags: GlobalTag[]) => void
  addTag:    (tag: GlobalTag) => void
  updateTag: (id: string, patch: Partial<GlobalTag>) => void
  removeTag: (id: string) => void
}

export const useTagsStore = create<TagsStore>()(
  persist(
    (set) => ({
      tags: [],
      setTags:   (tags) => set({ tags }),
      addTag:    (tag)  => set(st => ({ tags: [...st.tags, tag] })),
      updateTag: (id, patch) => set(st => ({
        tags: st.tags.map(t => t.id === id ? { ...t, ...patch } : t),
      })),
      removeTag: (id) => set(st => ({ tags: st.tags.filter(t => t.id !== id) })),
    }),
    { name: 'mto-tags' }
  )
)

// ─── Calculator store ─────────────────────────────────────────────────────────

export interface CalcState {
  runs:             Run[]
  stockOptimMode:   'min_waste' | 'min_sections'
  multiResults:     any | null
  lastCalcAt:       number | null
  lastCalcVersions: Record<string, number>

  setRuns:           (runs: Run[]) => void
  setStockOptimMode: (m: 'min_waste' | 'min_sections') => void
  setMultiResults:   (r: any | null) => void
  setLastCalc:       (at: number, versions: Record<string, number>) => void
  resetCalc:         () => void

  updateRun:    (id: string, patch: Partial<Run>) => void
  addRun:       () => void
  duplicateRun: (id: string) => void
  removeRun:    (id: string) => void
}

const makeRun = (name = 'Run 1'): Run => ({
  id: nanoid(),
  name,
  inputMode: 'simple',
  job: {},
  simpleJob: { length: '', corners: '', spacing: '' },
  segments: [],
  stockOverrides: {},
  qty: 1,
  criteriaState: {},
  variantState: {},
})

export const useCalcStore = create<CalcState>()((set, get) => ({
  runs:             [makeRun('Run 1')],
  stockOptimMode:   'min_waste',
  multiResults:     null,
  lastCalcAt:       null,
  lastCalcVersions: {},

  setRuns:           (runs) => set({ runs }),
  setStockOptimMode: (m)    => set({ stockOptimMode: m }),
  setMultiResults:   (r)    => set({ multiResults: r }),
  setLastCalc: (at, versions) => set({ lastCalcAt: at, lastCalcVersions: versions }),
  resetCalc: () => set({ runs: [makeRun('Run 1')], multiResults: null, stockOptimMode: 'min_waste' }),

  updateRun: (id, patch) => set(st => ({
    runs: st.runs.map(r => r.id === id ? { ...r, ...patch } : r),
    multiResults: null,
  })),
  addRun: () => set(st => ({
    runs: [...st.runs, makeRun('Run ' + (st.runs.length + 1))],
    multiResults: null,
  })),
  duplicateRun: (id) => set(st => {
    const r = st.runs.find(r => r.id === id)
    if (!r) return st
    const idx = st.runs.indexOf(r)
    const dup = { ...r, id: nanoid(), name: r.name + ' (copy)' }
    const next = [...st.runs]
    next.splice(idx + 1, 0, dup)
    return { runs: next, multiResults: null }
  }),
  removeRun: (id) => set(st => ({
    runs: st.runs.length > 1 ? st.runs.filter(r => r.id !== id) : st.runs,
    multiResults: null,
  })),
}))

// ─── Jobs store ───────────────────────────────────────────────────────────────

interface JobsStore {
  jobs: SavedJob[]
  setJobs:    (jobs: SavedJob[]) => void
  addJob:     (job: SavedJob) => void
  removeJob:  (id: string) => void
}

export const useMtoJobsStore = create<JobsStore>()(
  persist(
    (set) => ({
      jobs: [],
      setJobs:   (jobs) => set({ jobs }),
      addJob:    (job)  => set(st => ({ jobs: [job, ...st.jobs.filter(j => j.id !== job.id)].slice(0, 100) })),
      removeJob: (id)   => set(st => ({ jobs: st.jobs.filter(j => j.id !== id) })),
    }),
    { name: 'mto-jobs' }
  )
)
