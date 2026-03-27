// src/components/calculator/SystemShellSaaS.tsx
'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, FileText, Settings, BookOpen, Calculator, Lock, GitBranch, Copy, Link as LinkIcon, X, Network, List, Boxes, Library } from 'lucide-react'
import type { MtoSystem, GlobalTag, CompanyProfile, JobLastResults } from '@/types'
import type { Plan } from '@prisma/client'
import { useCalcStore } from '@/store'
import { computeMultiRun } from '@/lib/engine/compute'
import { getLimits, PLAN_META } from '@/lib/limits'
import { Modal } from '@/components/ui/Modal'
import SetupTab        from './SetupTab'
import MaterialsTab    from './MaterialsTab'
import CalculatorTab   from './CalculatorTab'
import SystemGraphTab  from './SystemGraphTab'
import RunsTab         from './RunsTab'
import ReportBuilder from '@/components/report/ReportBuilder'
import UpgradePrompt from '@/components/billing/UpgradePrompt'
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft'
import { usePermissions } from '@/lib/hooks/usePermissions'

type Tab = 'setup' | 'calculator' | 'runs'
type SetupSubTab = 'setup' | 'materials' | 'subassemblies' | 'library' | 'dependency'

interface Props {
  system:      any
  initialJobs: any[]
  globalTags:  GlobalTag[]
  userId:      string
  plan:        Plan
  profile?:    CompanyProfile | null
  initialDraft?: { runs?: any[]; stockOptimMode?: string } | null
  initialTab?:    Tab
  initialSubTab?: SetupSubTab
}

export default function SystemShellSaaS({
  system: initialSystem, initialJobs, globalTags: initialTags, plan, profile, initialDraft,
  initialTab, initialSubTab,
}: Props) {
  const router   = useRouter()
  const { canWrite } = usePermissions()
  const limits   = getLimits(plan)
  const planMeta = PLAN_META[plan]
  const calc     = useCalcStore()

  const [tab, setTab] = useState<Tab>(initialTab ?? 'setup')
  const [setupSubTab, setSetupSubTab] = useState<SetupSubTab>(initialSubTab ?? 'setup')
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

  // Sync tab state → URL
  useEffect(() => {
    let slug: string
    if (tab === 'setup') slug = setupSubTab === 'setup' ? 'setup' : setupSubTab
    else slug = tab
    router.replace(`/products/${sys.id}/${slug}`, { scroll: false })
  }, [tab, setupSubTab, sys.id, router])

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

  // Restore draft on mount
  useEffect(() => {
    if (initialDraft?.runs && Array.isArray(initialDraft.runs) && initialDraft.runs.length > 0) {
      calc.setRuns(initialDraft.runs)
      if (initialDraft.stockOptimMode) {
        calc.setStockOptimMode(initialDraft.stockOptimMode as 'min_waste' | 'min_sections')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-save runs draft
  useAutoSaveDraft(sys.id)

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

  // Lock / unlock system setup
  const lockSystem = useCallback(async () => {
    const snapshot: Record<string, number> = {}
    sys.materials.forEach((m: any) => { snapshot[m.id] = m._updatedAt ?? 0 })
    const patch: Partial<MtoSystem> = { isLocked: true, materialSnapshot: snapshot }
    setSys(s => ({ ...s, ...patch }))
    await persistSystem({ ...sys, ...patch })
  }, [sys, persistSystem])

  const unlockSystem = useCallback(async () => {
    const patch: Partial<MtoSystem> = { isLocked: false }
    setSys(s => ({ ...s, ...patch }))
    await persistSystem({ ...sys, ...patch })
  }, [sys, persistSystem])

  // Plan-gated update wrappers
  const updateSystemGated = useCallback((patch: Partial<MtoSystem>) => {
    if (sys.isLocked) {
      setLimitWarning('System is locked — unlock it first to make changes.')
      return
    }
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
  }, [limits, plan, updateSystem, isSample, sys.isLocked])

  // Save job
  const refreshJobs = async () => {
    const res = await fetch(`/api/jobs?systemId=${sys.id}`)
    const json = await res.json()
    if (json.data) setJobs(json.data)
  }

  const saveJob = async (name: string, lastResults?: JobLastResults | null, notes?: string): Promise<string | void> => {
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
        notes,
      }),
    })
    const { data, error } = await res.json()
    if (data) {
      setJobs((j: any[]) => [data, ...j])
      // Clear auto-saved draft after explicit job save
      fetch(`/api/mto/drafts?systemId=${sys.id}`, { method: 'DELETE' }).catch(() => {})
      return data.id as string
    }
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

  const NAV_TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: 'setup',      label: 'Setup',      Icon: Settings   },
    { id: 'calculator', label: 'Calculator', Icon: Calculator },
    { id: 'runs',       label: 'Runs',       Icon: List       },
  ]

  const SETUP_SUB_TABS: { id: SetupSubTab; label: string; Icon: React.ElementType }[] = [
    { id: 'setup',         label: 'Settings',       Icon: Settings },
    { id: 'materials',     label: 'Materials',      Icon: BookOpen },
    { id: 'subassemblies', label: 'Sub-assemblies', Icon: Boxes    },
    { id: 'library',       label: 'Library',        Icon: Library  },
    { id: 'dependency',    label: 'Dependency',     Icon: Network  },
  ]

  return (
    <div className="flex flex-col md:flex-row" style={{ minHeight: '100%' }}>

      {/* Mobile header: back + system name + save status */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2.5 border-b border-surface-200 bg-surface-50">
        <button onClick={() => router.push('/products')}
          className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink transition-colors shrink-0">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <span className="w-6 h-6 rounded-md flex items-center justify-center text-sm shrink-0 bg-surface-200/40">
          {sys.icon}
        </span>
        <span className="font-semibold text-xs text-ink truncate flex-1">{sys.name}</span>
        {saving && <span className="text-[10px] text-ink-faint flex items-center gap-1 shrink-0"><Save className="w-2.5 h-2.5" /></span>}
        {canWrite('systems') && <button onClick={() => setShowReport(true)} className="btn-primary text-[11px] px-2.5 py-1 shrink-0">
          <FileText className="w-3 h-3" />
        </button>}
      </div>

      {/* Mobile tab bar */}
      <nav className="md:hidden flex items-center gap-1 px-2 py-1.5 border-b border-surface-200 bg-surface-50 overflow-x-auto">
        {NAV_TABS.map(({ id, label, Icon }) => (
          <button key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[11px] font-medium whitespace-nowrap transition-colors duration-200 shrink-0 ${
              tab === id ? 'bg-surface-50 text-ink font-semibold shadow-[var(--shadow-card)]' : 'text-ink-muted hover:text-ink hover:bg-surface-100'
            }`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={tab === id ? 2.2 : 1.8} />
            {label}
          </button>
        ))}
      </nav>

      {/* Desktop secondary sidebar */}
      <aside
        className="hidden md:flex w-48 shrink-0 border-r border-surface-200 bg-surface-50 flex-col sticky top-0 self-start overflow-y-auto"
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
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-base flex-shrink-0 shadow-sm bg-surface-200/40">
              {sys.icon}
            </span>
            <span className="font-semibold text-xs text-ink leading-tight truncate">{sys.name}</span>
          </div>
          {saving && <div className="text-[10px] text-ink-faint mt-1 flex items-center gap-1"><Save className="w-2.5 h-2.5" /> Saving…</div>}
          {saveMsg && !saving && (
            <div className={`text-[10px] mt-1 ${saveMsg === 'Saved' ? 'text-primary' : 'text-red-500'}`}>{saveMsg}</div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 flex flex-col gap-0.5">
          {NAV_TABS.map(({ id, label, Icon }) => (
            <button key={id}
              onClick={() => setTab(id)}
              className={`sidebar-item text-[11px] ${tab === id ? 'active' : ''}`}>
              <span className={`icon-well ${tab === id ? 'text-primary' : ''}`}>
                <Icon className="w-[15px] h-[15px]" strokeWidth={tab === id ? 2.2 : 1.8} />
              </span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Plan badge */}
        <div className="px-3 py-2 border-t border-surface-200">
          <button onClick={() => router.push('/billing')}
            className="w-full text-[11px] font-semibold py-1 rounded-lg text-center transition-all hover:opacity-80 bg-surface-100 text-ink">
            {planMeta.name}
          </button>
        </div>

        {/* Actions */}
        <div className="px-3 pb-3 flex flex-col gap-2">
          {canWrite('systems') && jobs.length > 0 && (
            <button onClick={openAddToTender} className="btn-secondary text-xs w-full justify-center">
              <LinkIcon className="w-3.5 h-3.5" /> Tender
            </button>
          )}
          {canWrite('systems') && <button onClick={() => setShowReport(true)} className="btn-primary text-xs w-full justify-center">
            <FileText className="w-3.5 h-3.5" /> Report
          </button>}
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

        {/* Setup tab with sub-tabs */}
        {tab === 'setup' && (
          <>
            {/* Sub-tab bar */}
            <div className="flex items-center gap-1 px-3 md:px-6 py-2 border-b border-surface-200/50 bg-surface-50">
              {SETUP_SUB_TABS.map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setSetupSubTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors duration-200 rounded-[10px] ${
                    setupSubTab === id
                      ? 'bg-surface-50 text-ink font-semibold shadow-[var(--shadow-card)]'
                      : 'text-ink-muted hover:text-ink hover:bg-surface-100'
                  }`}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={setupSubTab === id ? 2.2 : 1.8} />
                  {label}
                </button>
              ))}
            </div>

            {/* Dependency sub-tab — full bleed, no padding */}
            {setupSubTab === 'dependency' && <SystemGraphTab sys={sys} />}

            {/* Padded content for setup, materials, sub-assemblies, library sub-tabs */}
            {setupSubTab !== 'dependency' && (
              <div className="px-3 pt-3 pb-4 md:px-6 md:pt-4 md:pb-6">
                {setupSubTab === 'setup' && (
                  <SetupTab sys={sys} onUpdate={updateSystemGated} globalTags={tags} onViewGraph={() => setSetupSubTab('dependency')}
                    isLocked={!!sys.isLocked} onLock={canWrite('systems') ? lockSystem : undefined} onUnlock={canWrite('systems') ? unlockSystem : undefined} />
                )}
                {setupSubTab === 'materials' && (
                  <MaterialsTab
                    sys={sys}
                    onUpdate={updateSystemGated}
                    globalTags={tags}
                    onGoToSetup={() => setSetupSubTab('setup')}
                    plan={plan}
                    view="materials"
                  />
                )}
                {setupSubTab === 'subassemblies' && (
                  <MaterialsTab
                    sys={sys}
                    onUpdate={updateSystemGated}
                    globalTags={tags}
                    onGoToSetup={() => setSetupSubTab('setup')}
                    plan={plan}
                    view="brackets"
                  />
                )}
                {setupSubTab === 'library' && (
                  <MaterialsTab
                    sys={sys}
                    onUpdate={updateSystemGated}
                    globalTags={tags}
                    onGoToSetup={() => setSetupSubTab('setup')}
                    plan={plan}
                    view="library"
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* Calculator tab */}
        {tab === 'calculator' && (
          <div className="px-3 pt-3 pb-4 md:px-6 md:pt-4 md:pb-6">
            <CalculatorTab
              sys={sys}
              jobs={jobs}
              onSaveJob={saveJob}
              onRunCalc={runCalc}
              globalTags={tags}
              plan={plan}
            />
          </div>
        )}

        {/* Runs tab */}
        {tab === 'runs' && (
          <div className="px-3 pt-3 pb-4 md:px-6 md:pt-4 md:pb-6">
            <RunsTab sys={sys} jobs={jobs} onRefresh={refreshJobs} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-md">
          <div className="bg-surface-50 rounded-2xl shadow-float w-full max-w-md mx-4 overflow-hidden animate-scale-in">
            <div className="card-header">
              <h3 className="font-display font-bold text-ink">Add to Tender</h3>
              <button onClick={() => setShowAddToTender(false)} className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-surface-100 transition-colors">
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
