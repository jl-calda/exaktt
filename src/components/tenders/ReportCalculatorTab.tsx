// src/components/tenders/ReportCalculatorTab.tsx
'use client'
import { useState, useCallback } from 'react'
import { Calculator } from 'lucide-react'
import type { MtoSystem, GlobalTag, JobLastResults } from '@/types'
import type { DocEstimate } from '@/lib/doc-builder/types'
import { useCalcStore } from '@/store'
import { computeMultiRun } from '@/lib/engine/compute'
import { buildLastResults } from '@/lib/engine/results-snapshot'
import CalculatorTab from '@/components/calculator/CalculatorTab'

interface Props {
  systems: any[]
  allJobs: any[]
  globalTags: any[]
  plan?: any
  tenderId: string
  onEstimateAdded?: (est: DocEstimate) => void
}

export default function ReportCalculatorTab({ systems, allJobs, globalTags, plan, tenderId, onEstimateAdded }: Props) {
  const [selectedSystemId, setSelectedSystemId] = useState<string>('')
  const [fullSystem, setFullSystem] = useState<MtoSystem | null>(null)
  const [loadingSystem, setLoadingSystem] = useState(false)
  const [jobs, setJobs] = useState<any[]>(allJobs)
  const calc = useCalcStore()

  // Fetch full system data when selected
  async function handleSystemSelect(systemId: string) {
    setSelectedSystemId(systemId)
    if (!systemId) { setFullSystem(null); return }
    setLoadingSystem(true)
    try {
      const res = await fetch(`/api/mto/systems/${systemId}`)
      const { data } = await res.json()
      if (data) {
        setFullSystem(data as MtoSystem)
        calc.resetCalc()
      }
    } finally {
      setLoadingSystem(false)
    }
  }

  // Run calculation client-side
  const runCalc = useCallback(() => {
    if (!fullSystem) return
    const result = computeMultiRun(calc.runs, fullSystem, calc.stockOptimMode)
    calc.setMultiResults(result)
    const versions: Record<string, number> = {}
    fullSystem.materials.forEach((m: any) => { versions[m.id] = m._updatedAt ?? 0 })
    calc.setLastCalc(Date.now(), versions)
  }, [calc, fullSystem])

  // Save job and link to tender
  const saveJob = async (name: string, lastResults?: JobLastResults | null, notes?: string): Promise<string | void> => {
    if (!fullSystem) return
    const _matVersions: Record<string, number> = {}
    fullSystem.materials.forEach((m: any) => { _matVersions[m.id] = m._updatedAt ?? 0 })

    const res = await fetch('/api/mto/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemId: fullSystem.id,
        name,
        runs: calc.runs,
        stockOptimMode: calc.stockOptimMode,
        calculatedAt: calc.lastCalcAt ?? Date.now(),
        matVersions: _matVersions,
        lastResults: lastResults ?? null,
        notes,
      }),
    })
    const { data, error } = await res.json()
    if (!data) { if (error) alert(error); return }

    setJobs(j => [data, ...j])

    // Auto-link to tender
    await fetch(`/api/tenders/${tenderId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemId: fullSystem.id, jobId: data.id }),
    })

    // Notify parent so estimate appears in Document tab sidebar
    if (onEstimateAdded && lastResults) {
      onEstimateAdded({
        id: data.id,
        systemName: fullSystem.name,
        jobName: name,
        description: `${fullSystem.name} — ${name}`,
        amount: lastResults.totals?.grandTotal ?? 0,
        resultSnapshot: lastResults,
      })
    }

    return data.id as string
  }

  const filteredJobs = fullSystem
    ? jobs.filter(j => j.mtoSystemId === fullSystem.id)
    : []

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* System selector */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-200 bg-surface-50">
        <Calculator className="w-4 h-4 text-ink-faint" />
        <label className="text-[11px] text-ink-muted font-medium">Product System:</label>
        <select
          value={selectedSystemId}
          onChange={e => handleSystemSelect(e.target.value)}
          className="input text-xs py-1.5 w-64"
        >
          <option value="">Select a system...</option>
          {systems.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {loadingSystem && <span className="text-[10px] text-ink-faint">Loading...</span>}
      </div>

      {/* Calculator content */}
      <div className="flex-1 overflow-y-auto">
        {!fullSystem ? (
          <div className="flex flex-col items-center justify-center py-20 text-ink-faint gap-3">
            <Calculator className="w-8 h-8" />
            <p className="text-[13px]">Select a product system to start calculating</p>
            <p className="text-[11px]">Results will be available as estimates in the Document tab</p>
          </div>
        ) : (
          <div className="px-3 pt-3 pb-4 md:px-6 md:pt-4 md:pb-6">
            <CalculatorTab
              sys={fullSystem}
              jobs={filteredJobs}
              onSaveJob={saveJob}
              onRunCalc={runCalc}
              globalTags={globalTags as GlobalTag[]}
              plan={plan}
            />
          </div>
        )}
      </div>
    </div>
  )
}
