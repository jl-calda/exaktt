// src/components/calculator/SystemShellSaaS.tsx
'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, FileText, Settings, BookOpen, Calculator, Tag, Lock, GitBranch, Copy, Link as LinkIcon, X } from 'lucide-react'
import type { MtoSystem, GlobalTag, CompanyProfile } from '@/types'
import type { Plan } from '@prisma/client'
import { useCalcStore } from '@/store'
import { computeMultiRun } from '@/lib/engine/compute'
import { getLimits, PLAN_META } from '@/lib/limits'
import { Modal } from '@/components/ui/Modal'
import SetupTab        from './SetupTab'
import MaterialsTab    from './MaterialsTab'
import CalculatorTab   from './CalculatorTab'
import SettingsTab     from './SettingsTab'
import SystemGraphTab  from './SystemGraphTab'
import ReportBuilder from '@/components/report/ReportBuilder'
import UpgradePrompt from '@/components/billing/UpgradePrompt'

type Tab = 'setup' | 'materials' | 'calculator' | 'graph' | 'settings'

interface Props {
  system:      any
  initialJobs: any[]
  globalTags:  GlobalTag[]
  userId:      string
  plan:        Plan
  profile?:    CompanyProfile | null
}

export default function SystemShellSaaS({
  system: initialSystem, initialJobs, globalTags: initialTags, plan, profile,
}: Props) {
  const router   = useRouter()
  const limits   = getLimits(plan)
  const planMeta = PLAN_META[plan]
  const calc     = useCalcStore()

  const [tab, setTab] = useState<Tab>('setup')
  const [sys,          setSys]          = useState<MtoSystem>(initialSystem)
  const [jobs,         setJobs]         = useState(initialJobs)
  const [tags,         setTags]         = useState<GlobalTag[]>(initialTags)
  const [saving,       setSaving]       = useState(false)
  const [dirty,        setDirty]        = useState(false)
  const [saveMsg,      setSaveMsg]      = useState<string | null>(null)
  const [showReport,       setShowReport]       = useState(false)
  const [showAddToTender,  setShowAddToTender]  = useState(false)
  const [tenders,          setTenders]          = useState<any[]>([])
  const [selectedTender,   setSelectedTender]   = useState('')
  const [selectedJob,      setSelectedJob]      = useState('')
  const [addingToTender,   setAddingToTender]   = useState(false)
  const [limitWarning,     setLimitWarning]     = useState<string | null>(null)
  const [duplicating,      setDuplicating]      = useState(false)

  const isSample = sys.name.includes('(Sample)')

  // Auto-save
  const persistSystem = useCallback(async (updated: MtoSystem) => {
    setSaving(true)
    try {
      const res = await fetch('/api/mto/systems/' + updated.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      const { error } = await res.json()
      if (error) { setSaveMsg('Save failed'); return }
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

  // Duplicate sample system
  const handleDuplicate = async () => {
    setDuplicating(true)
    const newName = sys.name.replace(/\s*\(Sample\)/gi, '').trim()
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = sys as any
    const res = await fetch('/api/mto/systems', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rest, name: newName + ' (Copy)' }),
    })
    const { data, error } = await res.json()
    setDuplicating(false)
    if (error) { setLimitWarning(error); return }
    if (data?.id) router.push('/mto/system/' + data.id)
  }

  // Plan-gated update wrappers
  const updateSystemGated = useCallback((patch: Partial<MtoSystem>) => {
    if (isSample) {
      setLimitWarning('This is a sample system — duplicate it to make your own editable copy.')
      return
    }
    if (patch.customDims && !limits.customDims) {
      setLimitWarning('Custom dimensions require Pro or Max plan')
      return
    }
    if (patch.variants && !limits.customDims) {
      setLimitWarning('Variants require Pro or Max plan')
      return
    }
    if (patch.materials && limits.maxMaterials !== -1 && patch.materials.length > limits.maxMaterials) {
      setLimitWarning(`You've reached the ${limits.maxMaterials} material limit on your ${plan} plan`)
      return
    }
    updateSystem(patch)
  }, [limits, plan, updateSystem, isSample])

  // Save job
  const saveJob = async (name: string, lastResults?: any) => {
    if (limits.maxJobsSaved !== -1) {
      const res  = await fetch('/api/limits')
      const { data } = await res.json()
      if (data?.usage?.jobs >= limits.maxJobsSaved) {
        setLimitWarning(`You've reached the ${limits.maxJobsSaved} saved job limit`)
        return
      }
    }
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
      }),
    })
    const { data, error } = await res.json()
    if (data)  setJobs((j: any[]) => [data, ...j])
    if (error) setLimitWarning(error)
  }

  // Run calculation
  const runCalc = useCallback(() => {
    const result = computeMultiRun(calc.runs, sys, calc.stockOptimMode)
    calc.setMultiResults(result)
    const versions: Record<string, number> = {}
    sys.materials.forEach((m: any) => { versions[m.id] = m._updatedAt ?? 0 })
    calc.setLastCalc(Date.now(), versions)
  }, [calc, sys])

  const openAddToTender = async () => {
    const res = await fetch('/api/tenders')
    const { data } = await res.json()
    setTenders((data ?? []).filter((t: any) => t.status === 'DRAFT'))
    setSelectedTender('')
    setSelectedJob(jobs.length > 0 ? jobs[0].id : '')
    setShowAddToTender(true)
  }

  const handleAddToTender = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTender || !selectedJob) return
    setAddingToTender(true)
    const res = await fetch(`/api/tenders/${selectedTender}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: selectedJob, systemId: sys.id, sortOrder: 0 }),
    })
    const { error } = await res.json()
    if (error) { setLimitWarning(error); setAddingToTender(false); return }
    setShowAddToTender(false)
    setAddingToTender(false)
  }

  const NAV_TABS: { id: Tab; label: string; Icon: React.ElementType; locked?: boolean }[] = [
    { id: 'setup',      label: 'Setup',      Icon: Settings   },
    { id: 'materials',  label: 'Materials',  Icon: BookOpen   },
    { id: 'calculator', label: 'Calculator', Icon: Calculator },
    { id: 'graph',      label: 'Graph',      Icon: GitBranch  },
    { id: 'settings',   label: 'Tags',       Icon: Tag,       locked: !limits.tags },
  ]

  return (
    <div className="flex" style={{ minHeight: '100%' }}>

      {/* Secondary sidebar */}
      <aside
        className="w-48 shrink-0 border-r border-surface-200 bg-surface-50 flex flex-col sticky top-0 self-start overflow-y-auto"
        style={{ height: 'calc(100vh - 52px)', borderRight: '1px solid var(--sidebar-border)' }}>

        {/* Back */}
        <div className="px-3 py-2.5 border-b border-surface-200">
          <button onClick={() => router.push('/products')}
            className="flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Products
          </button>
        </div>

        {/* Identity */}
        <div className="px-3 py-3 border-b border-surface-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base flex-shrink-0">{sys.icon}</span>
            <span className="font-semibold text-xs text-ink leading-tight truncate">{sys.name}</span>
          </div>
          {saving && <div className="text-[10px] text-ink-faint mt-1 flex items-center gap-1"><Save className="w-2.5 h-2.5" /> Saving…</div>}
          {saveMsg && !saving && (
            <div className={`text-[10px] mt-1 ${saveMsg === 'Saved' ? 'text-primary' : 'text-red-500'}`}>{saveMsg}</div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 flex flex-col gap-px">
          {NAV_TABS.map(({ id, label, Icon, locked }) => (
            <button key={id}
              onClick={() => {
                if (locked) { setLimitWarning('Tags require a higher plan'); return }
                setTab(id)
              }}
              className={`sidebar-item text-[11px] ${tab === id ? 'active' : ''} ${locked ? 'opacity-40 cursor-default' : ''}`}>
              <Icon className="w-[15px] h-[15px] shrink-0" strokeWidth={tab === id ? 2.2 : 1.8} />
              <span>{label}</span>
              {locked && <Lock className="w-2.5 h-2.5 ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Plan badge */}
        <div className="px-3 py-2 border-t border-surface-200">
          <button onClick={() => router.push('/billing')}
            className="w-full text-[11px] font-semibold py-1 rounded-md text-center transition-all hover:opacity-80"
            style={{ background: planMeta.color + '18', color: planMeta.color }}>
            {planMeta.name}
          </button>
        </div>

        {/* Actions */}
        <div className="px-3 pb-3 flex flex-col gap-2">
          {jobs.length > 0 && (
            <button onClick={openAddToTender} className="btn-secondary text-xs w-full justify-center">
              <LinkIcon className="w-3.5 h-3.5" /> Tender
            </button>
          )}
          <button onClick={() => setShowReport(true)} className="btn-primary text-xs w-full justify-center">
            <FileText className="w-3.5 h-3.5" /> Report
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">

        {/* Limit warning banner */}
        {limitWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-amber-800">⚠️ {limitWarning}</div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={() => router.push('/billing')} className="text-xs font-semibold text-primary underline">Upgrade</button>
              <button onClick={() => setLimitWarning(null)} className="text-amber-600 hover:text-amber-800 text-lg leading-none">×</button>
            </div>
          </div>
        )}

        {/* Sample system banner */}
        {isSample && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <span>📋</span>
              <span className="font-semibold">Sample system</span>
              <span className="text-amber-600 hidden sm:inline">— changes cannot be saved. Duplicate to create your own editable copy.</span>
            </div>
            <button onClick={handleDuplicate} disabled={duplicating}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-800 text-white hover:bg-amber-900 disabled:opacity-50 transition-colors">
              <Copy className="w-3.5 h-3.5" />
              {duplicating ? 'Duplicating…' : 'Duplicate to Edit'}
            </button>
          </div>
        )}

        {/* Graph tab — full bleed, no padding */}
        {tab === 'graph' && <SystemGraphTab sys={sys} />}

        {/* Padded content for all other tabs */}
        {tab !== 'graph' && (
          <div className="px-6 pt-4 pb-6">
            {tab === 'setup' && (
              <SetupTab sys={sys} onUpdate={updateSystemGated} globalTags={tags} onViewGraph={() => setTab('graph')} />
            )}
            {tab === 'materials' && (
              <MaterialsTab
                sys={sys}
                onUpdate={updateSystemGated}
                globalTags={tags}
                onGoToSetup={() => setTab('setup')}
                plan={plan}
                subTab="all"
              />
            )}
            {tab === 'calculator' && (
              <CalculatorTab
                sys={sys}
                jobs={jobs}
                onSaveJob={saveJob}
                onRunCalc={runCalc}
                globalTags={tags}
                plan={plan}
              />
            )}
            {tab === 'settings' && limits.tags && (
              <SettingsTab tags={tags} onTagsChange={setTags} />
            )}
            {tab === 'settings' && !limits.tags && (
              <div className="max-w-lg">
                <UpgradePrompt
                  feature="Material Tags"
                  description="Tags let you categorise materials across systems — filter by structural, FHLL, hot-dip-galv and more."
                  upgradeTo="PRO"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Builder modal */}
      <Modal open={showReport} onClose={() => setShowReport(false)} title="Generate Report" maxWidth="max-w-6xl">
        {calc.multiResults ? (
          <ReportBuilder
            sys={sys}
            results={calc.multiResults.combined ?? []}
            runs={calc.runs}
            plan={plan}
            profile={profile}
            onClose={() => setShowReport(false)}
          />
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🧮</div>
            <h3 className="font-display font-bold text-lg text-ink mb-2">No calculation yet</h3>
            <p className="text-sm text-ink-muted mb-4">Run a calculation first, then generate your report.</p>
            <button onClick={() => { setShowReport(false); setTab('calculator') }} className="btn-primary">
              Go to Calculator
            </button>
          </div>
        )}
      </Modal>

      {/* Add to Tender modal */}
      {showAddToTender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-ink">Add to Tender</h3>
              <button onClick={() => setShowAddToTender(false)} className="text-ink-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddToTender} className="p-6 space-y-4">
              <div>
                <label className="label">Tender (draft only)</label>
                {tenders.length === 0 ? (
                  <p className="text-sm text-ink-muted py-2">
                    No draft tenders found.{' '}
                    <button type="button" onClick={() => router.push('/tenders')}
                      className="text-primary underline">Create one first →</button>
                  </p>
                ) : (
                  <select value={selectedTender} onChange={e => setSelectedTender(e.target.value)}
                    className="input" required>
                    <option value="">— select tender —</option>
                    {tenders.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}{t.client ? ` — ${t.client}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="label">Calculation run</label>
                <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
                  className="input" required>
                  {jobs.map((j: any) => (
                    <option key={j.id} value={j.id}>{j.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={addingToTender || !selectedTender || !selectedJob}
                  className="btn-primary flex-1">
                  {addingToTender ? 'Adding…' : 'Add to tender'}
                </button>
                <button type="button" onClick={() => setShowAddToTender(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
