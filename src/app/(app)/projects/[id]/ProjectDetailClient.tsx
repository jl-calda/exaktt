// src/app/(app)/projects/[id]/ProjectDetailClient.tsx
'use client'
import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, differenceInDays } from 'date-fns'
import {
  ArrowLeft, Plus, ChevronDown, ChevronRight, Calendar,
  AlertTriangle, CheckCircle2, Clock, MoreHorizontal, Trash2, Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import GanttChart from '@/components/projects/GanttChart'
import GanttToolbar from '@/components/projects/GanttToolbar'
import MilestoneModal from '@/components/projects/MilestoneModal'
import ActivityModal from '@/components/projects/ActivityModal'
import ProjectFormModal from '@/components/projects/ProjectFormModal'
import { MILESTONE_COLORS, getColor } from '@/components/projects/colors'

/* ── Types ── */
type Activity = {
  id: string; name: string; description?: string | null
  assigneeId?: string | null; assigneeName?: string | null
  teamId?: string | null; team?: any; assignee?: any
  startDate?: string | null; endDate?: string | null
  isWithinDay?: boolean; startTime?: string | null; endTime?: string | null
  status: string; progress: number; color: string
  sortOrder: number; assetIds: string[]
  requiredOutput: string[]
}
type Milestone = {
  id: string; name: string; description?: string | null
  color: string; startDate?: string | null; endDate?: string | null
  sortOrder: number; activities: Activity[]
}
type Project = {
  id: string; name: string; clientName?: string | null
  status: string; startDate?: string | null; endDate?: string | null
  contractValue: number; address?: string | null
  managerName?: string | null; milestones: Milestone[]
  tenderId?: string | null; reportId?: string | null
  quotationNo?: string | null
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  PLANNING:  { label: 'Planning',  bg: '#f1f5f9', color: '#64748b' },
  ACTIVE:    { label: 'Active',    bg: '#f0fdf4', color: '#16a34a' },
  ON_HOLD:   { label: 'On Hold',   bg: '#fffbeb', color: '#d97706' },
  COMPLETED: { label: 'Completed', bg: '#eff6ff', color: '#2563eb' },
  CANCELLED: { label: 'Cancelled', bg: '#f9fafb', color: '#9ca3af' },
}

interface Props { project: Project; teams: any[]; assets: any[] }

export default function ProjectDetailClient({ project: initialProject, teams, assets }: Props) {
  const router = useRouter()
  const [project, setProject] = useState(initialProject)
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months'>('weeks')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // Modals
  const [editProject, setEditProject] = useState(false)
  const [milestoneModal, setMilestoneModal] = useState<{ open: boolean; milestone?: Milestone }>({ open: false })
  const [activityModal, setActivityModal] = useState<{ open: boolean; milestoneId?: string; activity?: Activity }>({ open: false })
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  // Inline milestone form
  const [showInlineForm, setShowInlineForm] = useState(false)
  const [inlineName, setInlineName] = useState('')
  const [inlineColor, setInlineColor] = useState(() => getColor(MILESTONE_COLORS, project.milestones.length))
  const [inlineStartDate, setInlineStartDate] = useState('')
  const [inlineEndDate, setInlineEndDate] = useState('')
  const [inlineSaving, setInlineSaving] = useState(false)

  /* ── PM Indicators ── */
  const allActivities = useMemo(() => project.milestones.flatMap(m => m.activities), [project])
  const totalActivities = allActivities.length
  const completedActivities = allActivities.filter(a => a.status === 'COMPLETED').length
  const overdueActivities = allActivities.filter(a => {
    if (a.status === 'COMPLETED') return false
    if (!a.endDate) return false
    return new Date(a.endDate) < new Date()
  }).length
  const progressPct = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0
  const milestoneDone = project.milestones.filter(m =>
    m.activities.length > 0 && m.activities.every(a => a.status === 'COMPLETED')
  ).length
  const daysRemaining = project.endDate ? differenceInDays(new Date(project.endDate), new Date()) : null

  /* ── Collapse toggle ── */
  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const collapseAll = useCallback(() => {
    setCollapsed(new Set(project.milestones.map(m => m.id)))
  }, [project.milestones])

  const expandAll = useCallback(() => setCollapsed(new Set()), [])

  /* ── API helpers ── */
  const updateProject = useCallback(async (data: any) => {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return
    const updated = await res.json()
    setProject(prev => ({ ...prev, ...updated }))
    setEditProject(false)
    setShowStatusMenu(false)
  }, [project.id])

  const saveMilestone = useCallback(async (data: any) => {
    const editing = milestoneModal.milestone
    if (editing) {
      const res = await fetch(`/api/projects/${project.id}/milestones/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) return
      const updated = await res.json()
      setProject(prev => ({
        ...prev,
        milestones: prev.milestones.map(m => m.id === editing.id ? { ...m, ...updated } : m),
      }))
    } else {
      const res = await fetch(`/api/projects/${project.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) return
      const created = await res.json()
      setProject(prev => ({
        ...prev,
        milestones: [...prev.milestones, { ...created, activities: created.activities ?? [] }],
      }))
    }
    setMilestoneModal({ open: false })
  }, [project.id, milestoneModal.milestone])

  const deleteMilestone = useCallback(async (milestoneId: string) => {
    await fetch(`/api/projects/${project.id}/milestones/${milestoneId}`, { method: 'DELETE' })
    setProject(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== milestoneId),
    }))
  }, [project.id])

  const saveActivity = useCallback(async (milestoneId: string, data: any) => {
    const editing = activityModal.activity
    if (editing) {
      const res = await fetch(`/api/projects/${project.id}/milestones/${milestoneId}/activities/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) return
      const updated = await res.json()
      setProject(prev => ({
        ...prev,
        milestones: prev.milestones.map(m =>
          m.id === milestoneId
            ? { ...m, activities: m.activities.map(a => a.id === editing.id ? { ...a, ...updated } : a) }
            : m
        ),
      }))
    } else {
      const res = await fetch(`/api/projects/${project.id}/milestones/${milestoneId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) return
      const created = await res.json()
      setProject(prev => ({
        ...prev,
        milestones: prev.milestones.map(m =>
          m.id === milestoneId
            ? { ...m, activities: [...m.activities, created] }
            : m
        ),
      }))
    }
    setActivityModal({ open: false })
  }, [project.id, activityModal.activity])

  const deleteActivity = useCallback(async (milestoneId: string, activityId: string) => {
    await fetch(`/api/projects/${project.id}/milestones/${milestoneId}/activities/${activityId}`, { method: 'DELETE' })
    setProject(prev => ({
      ...prev,
      milestones: prev.milestones.map(m =>
        m.id === milestoneId
          ? { ...m, activities: m.activities.filter(a => a.id !== activityId) }
          : m
      ),
    }))
  }, [project.id])

  const resetInlineForm = useCallback(() => {
    setShowInlineForm(false)
    setInlineName('')
    setInlineStartDate('')
    setInlineEndDate('')
  }, [])

  const handleInlineSave = useCallback(async () => {
    if (!inlineName.trim()) return
    setInlineSaving(true)
    const res = await fetch(`/api/projects/${project.id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: inlineName.trim(),
        description: null,
        color: inlineColor,
        startDate: inlineStartDate || null,
        endDate: inlineEndDate || null,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      setProject(prev => ({
        ...prev,
        milestones: [...prev.milestones, { ...created, activities: created.activities ?? [] }],
      }))
      resetInlineForm()
      // Pre-select next color for the next milestone
      setInlineColor(getColor(MILESTONE_COLORS, project.milestones.length + 1))
    }
    setInlineSaving(false)
  }, [project.id, project.milestones.length, inlineName, inlineColor, inlineStartDate, inlineEndDate, resetInlineForm])

  const sm = STATUS_META[project.status] ?? STATUS_META.PLANNING

  return (
    <div className="min-h-full">
      <main className="px-4 py-4 md:px-6 md:py-5 max-w-7xl">
        {/* Back + title */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/projects')} className="text-ink-faint hover:text-ink">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-semibold text-base text-ink flex-1">{project.name}</h1>
          <Button variant="ghost" size="xs" onClick={() => setEditProject(true)}
            icon={<Pencil className="w-3 h-3" />}>
            Edit
          </Button>
        </div>

        {/* Project info bar */}
        <div className="flex items-center gap-3 flex-wrap mb-5">
          {/* Status dropdown */}
          <div className="relative">
            <button onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="badge text-[10px] cursor-pointer" style={{ background: sm.bg, color: sm.color }}>
              {sm.label}
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>
            {showStatusMenu && (
              <div className="absolute left-0 top-full mt-1 bg-surface-50 border border-surface-200 rounded-xl shadow-panel z-20 py-1 min-w-[140px] animate-fade-in">
                {Object.entries(STATUS_META).map(([key, meta]) => (
                  <button key={key} onClick={() => updateProject({ status: key })}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-surface-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                    {meta.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {project.clientName && (
            <span className="text-[10px] text-ink-faint">Client: <span className="text-ink-muted">{project.clientName}</span></span>
          )}
          {project.startDate && (
            <span className="text-[10px] text-ink-faint flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(project.startDate), 'd MMM yy')}
              {project.endDate && ` → ${format(new Date(project.endDate), 'd MMM yy')}`}
            </span>
          )}
          {project.contractValue > 0 && (
            <span className="text-[10px] text-ink-faint">
              Value: <span className="font-mono text-ink-muted">${project.contractValue.toLocaleString()}</span>
            </span>
          )}
          {project.managerName && (
            <span className="text-[10px] text-ink-faint">PM: <span className="text-ink-muted">{project.managerName}</span></span>
          )}
        </div>

        {/* PM indicators */}
        <div className="flex items-center gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-[10px] font-mono text-ink-muted">{progressPct}%</span>
            </div>
          </div>
          <span className="text-[10px] text-ink-faint flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            {milestoneDone}/{project.milestones.length} milestones
          </span>
          {overdueActivities > 0 && (
            <span className="text-[10px] text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {overdueActivities} overdue
            </span>
          )}
          {daysRemaining !== null && daysRemaining >= 0 && (
            <span className="text-[10px] text-ink-faint flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {daysRemaining}d remaining
            </span>
          )}
        </div>

        {/* Gantt toolbar */}
        <GanttToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAddMilestone={() => {
            setInlineColor(getColor(MILESTONE_COLORS, project.milestones.length))
            setShowInlineForm(true)
          }}
          onCollapseAll={collapseAll}
          onExpandAll={expandAll}
        />

        {/* Gantt chart */}
        <GanttChart
          project={project}
          viewMode={viewMode}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          onClickMilestone={(m) => setMilestoneModal({ open: true, milestone: m })}
          onClickActivity={(a, milestoneId) => setActivityModal({ open: true, milestoneId, activity: a })}
          onAddActivity={(milestoneId) => setActivityModal({ open: true, milestoneId })}
          onDeleteMilestone={deleteMilestone}
          onDeleteActivity={deleteActivity}
        />

        {/* Inline milestone form */}
        {showInlineForm && (
          <div className="card p-3 mt-2 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <input
                className="input flex-1"
                placeholder="Milestone name"
                autoFocus
                value={inlineName}
                onChange={e => setInlineName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleInlineSave(); if (e.key === 'Escape') resetInlineForm() }}
              />
              <div className="flex gap-1">
                {MILESTONE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setInlineColor(c)}
                    className="w-5 h-5 rounded-full border-2 transition-all"
                    style={{
                      background: c,
                      borderColor: inlineColor === c ? c : 'transparent',
                      transform: inlineColor === c ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="input w-32"
                value={inlineStartDate}
                onChange={e => setInlineStartDate(e.target.value)}
              />
              <span className="text-[10px] text-ink-faint">→</span>
              <input
                type="date"
                className="input w-32"
                value={inlineEndDate}
                onChange={e => setInlineEndDate(e.target.value)}
              />
              <div className="flex-1" />
              <Button variant="ghost" size="xs" onClick={resetInlineForm}>Cancel</Button>
              <Button variant="primary" size="xs" onClick={handleInlineSave} loading={inlineSaving} disabled={!inlineName.trim()}>Add</Button>
            </div>
          </div>
        )}

        {/* Milestone list fallback for empty state */}
        {project.milestones.length === 0 && !showInlineForm && (
          <div className="card p-8 text-center mt-4">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-[13px] font-semibold text-ink mb-1">No milestones yet</div>
            <div className="text-xs text-ink-faint mb-4">Add milestones and activities to build your project timeline.</div>
            <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setInlineColor(getColor(MILESTONE_COLORS, project.milestones.length))
                setShowInlineForm(true)
              }}>
              Add Milestone
            </Button>
          </div>
        )}
      </main>

      {/* Modals */}
      {editProject && (
        <ProjectFormModal
          initial={{
            name: project.name,
            clientName: project.clientName ?? '',
            address: project.address ?? '',
            contractValue: project.contractValue,
            status: project.status,
            startDate: project.startDate ? format(new Date(project.startDate), 'yyyy-MM-dd') : '',
            endDate: project.endDate ? format(new Date(project.endDate), 'yyyy-MM-dd') : '',
            managerName: project.managerName ?? '',
          }}
          onSave={updateProject}
          onClose={() => setEditProject(false)}
        />
      )}

      {milestoneModal.open && milestoneModal.milestone && (
        <MilestoneModal
          milestone={milestoneModal.milestone}
          onSave={saveMilestone}
          onClose={() => setMilestoneModal({ open: false })}
        />
      )}

      {activityModal.open && activityModal.milestoneId && (
        <ActivityModal
          activity={activityModal.activity}
          milestoneId={activityModal.milestoneId}
          teams={teams}
          assets={assets}
          onSave={(data) => saveActivity(activityModal.milestoneId!, data)}
          onClose={() => setActivityModal({ open: false })}
        />
      )}
    </div>
  )
}
