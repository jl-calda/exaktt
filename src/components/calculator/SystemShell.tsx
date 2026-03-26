// src/components/calculator/SystemShell.tsx
'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calculator, Settings, BookOpen, Tag, Save } from 'lucide-react'
import type { MtoSystem, GlobalTag } from '@/types'
import { useCalcStore } from '@/store'
import { computeMultiRun } from '@/lib/engine/compute'
import SetupTab from './SetupTab'
import MaterialsTab from './MaterialsTab'
import CalculatorTab from './CalculatorTab'
import SettingsTab from './SettingsTab'

type Tab = 'setup' | 'materials' | 'calculator' | 'settings'

interface Props {
  system:      any
  initialJobs: any[]
  globalTags:  GlobalTag[]
  userId:      string
}

export default function SystemShell({ system: initialSystem, initialJobs, globalTags: initialTags }: Props) {
  const router = useRouter()
  const [tab, setTab]       = useState<Tab>('setup')
  const [sys, setSys]       = useState<MtoSystem>(initialSystem)
  const [jobs, setJobs]     = useState(initialJobs)
  const [tags, setTags]     = useState<GlobalTag[]>(initialTags)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty]   = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const calc = useCalcStore()

  const persistSystem = useCallback(async (updated: MtoSystem) => {
    setSaving(true)
    try {
      await fetch('/api/mto/systems/' + updated.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      setSaveMsg('Saved'); setTimeout(() => setSaveMsg(null), 2000)
    } catch { setSaveMsg('Save failed') }
    setSaving(false); setDirty(false)
  }, [])

  const updateSystem = useCallback((patch: Partial<MtoSystem>) => {
    setSys(s => { setDirty(true); return { ...s, ...patch } })
  }, [])

  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => persistSystem(sys), 1500)
    return () => clearTimeout(t)
  }, [sys, dirty, persistSystem])

  const saveJob = async (name: string, lastResults?: any, notes?: string): Promise<string | void> => {
    const _matVersions: Record<string, number> = {}
    sys.materials.forEach((m: any) => { _matVersions[m.id] = m._updatedAt ?? 0 })
    const res = await fetch('/api/mto/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemId: sys.id, name,
        runs: calc.runs,
        stockOptimMode: calc.stockOptimMode,
        calculatedAt: calc.lastCalcAt ?? Date.now(),
        matVersions: _matVersions,
        lastResults: lastResults ?? null,
        notes,
      }),
    })
    const { data } = await res.json()
    if (data) { setJobs((j: any[]) => [data, ...j]); return data.id as string }
  }

  const runCalc = useCallback(() => {
    const result = computeMultiRun(calc.runs, sys, calc.stockOptimMode)
    calc.setMultiResults(result)
    const versions: Record<string, number> = {}
    sys.materials.forEach((m: any) => { versions[m.id] = m._updatedAt ?? 0 })
    calc.setLastCalc(Date.now(), versions)
  }, [calc, sys])

  const tabs = [
    { id: 'setup' as Tab,      label: 'System Setup',  icon: '⚙️' },
    { id: 'materials' as Tab,  label: 'Materials',      icon: '📋' },
    { id: 'calculator' as Tab, label: 'Calculator',     icon: '🧮' },
    { id: 'settings' as Tab,   label: 'Tags',           icon: '🏷️' },
  ]

  return (
    <div className="min-h-screen bg-surface-100 flex flex-col">
      <header className="bg-ink sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="text-white/50 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl">{sys.icon}</span>
            <span className="font-display font-black text-sm text-white truncate">{sys.name}</span>
          </div>
          {saving && <Save className="w-4 h-4 text-white/40 animate-spin" />}
          {saveMsg && !saving && <span className="text-xs text-emerald-400">{saveMsg}</span>}
          <nav className="flex gap-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all duration-200 ${
                  tab === t.id ? 'bg-primary text-white shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}>
                {t.icon} <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6">
        {tab === 'setup'      && <SetupTab sys={sys} onUpdate={updateSystem} />}
        {tab === 'materials'  && <MaterialsTab sys={sys} onUpdate={updateSystem} globalTags={tags} onGoToSetup={() => setTab('setup')} />}
        {tab === 'calculator' && <CalculatorTab sys={sys} jobs={jobs} onSaveJob={saveJob} onRunCalc={runCalc} globalTags={tags} />}
        {tab === 'settings'   && <SettingsTab tags={tags} onTagsChange={setTags} />}
      </main>
    </div>
  )
}
