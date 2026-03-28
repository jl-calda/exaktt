// src/app/(app)/projects/[id]/ProjectDetailClient.tsx
'use client'
import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, differenceInDays } from 'date-fns'
import {
  ArrowLeft, Plus, ChevronDown, Calendar,
  AlertTriangle, CheckCircle2, Clock, Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import GanttChart from '@/components/projects/GanttChart'
import GanttToolbar from '@/components/projects/GanttToolbar'
import ProjectFormModal from '@/components/projects/ProjectFormModal'

/* ── Types ── */
type Activity = {
  id: string; name: string; description?: string | null
  assigneeId?: string | null; assigneeName?: string | null
  teamId?: string | null; team?: any; assignee?: any
  startDate?: string | null; endDate?: string | null
  isWithinDay?: boolean; startTime?: string | null; endTime?: string | null
  status: string; progress: number; color: string
  sortOrder: number; assetIds: string[]
  skills?: string[]; requiredOutput: string[]
  estimatedHours?: number | null
  icon?: string | null
}
type Milestone = {
  id: string; name: string; description?: string | null
  color: string; startDate?: string | null; endDate?: string | null
  sortOrder: number; activities: Activity[]
  icon?: string | null
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

interface Props { project: Project; teams: any[]; assets: any[]; categories?: any[] }

export default function ProjectDetailClient({ project: initialProject, teams, assets, categories }: Props) {
  const router = useRouter()
  const [project, setProject] = useState(initialProject)
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months'>('weeks')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // Project edit modal (only project-level uses a modal)
  const [editProject, setEditProject] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newRow, setNewRow] = useState<{ type: 'milestone' | 'activity'; milestoneId?: string } | null>(null)

  /* ── PM Indicators (duration-weighted progress) ── */
  const allActivities = useMemo(() => project.milestones.flatMap(m => m.activities), [project])
  const totalActivities = allActivities.length
  const overdueActivities = allActivities.filter(a => {
    if (a.status === 'COMPLETED') return false
    if (!a.endDate) return false
    return new Date(a.endDate) < new Date()
  }).length

  // Weighted progress: longer activities contribute more to overall %
  const progressPct = useMemo(() => {
    if (allActivities.length === 0) return 0
    let totalWeight = 0
    let weightedProgress = 0
    allActivities.forEach(a => {
      // Weight = duration in days (min 1). Activities without dates get weight 1.
      let duration = 1
      if (a.startDate && a.endDate) {
        duration = Math.max(differenceInDays(new Date(a.endDate), new Date(a.startDate)) + 1, 1)
      }
      totalWeight += duration
      weightedProgress += duration * (a.progress / 100)
    })
    return totalWeight > 0 ? Math.round((weightedProgress / totalWeight) * 100) : 0
  }, [allActivities])

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

  const saveMilestone = useCallback(async (data: any, existingId?: string) => {
    if (existingId) {
      const res = await fetch(`/api/projects/${project.id}/milestones/${existingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) return
      const updated = await res.json()
      setProject(prev => ({
        ...prev,
        milestones: prev.milestones.map(m => m.id === existingId ? { ...m, ...updated } : m),
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
    setEditingId(null)
    setNewRow(null)
  }, [project.id])

  // Auto-fill milestone start/end dates from its activities
  const autoFillMilestoneDates = useCallback(async (milestoneId: string, activities: Activity[]) => {
    const dates = activities
      .flatMap(a => [a.startDate, a.endDate])
      .filter(Boolean)
      .map(d => new Date(d!))
    if (dates.length === 0) return
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())))
    const latest = new Date(Math.max(...dates.map(d => d.getTime())))
    const mStart = format(earliest, 'yyyy-MM-dd')
    const mEnd = format(latest, 'yyyy-MM-dd')
    // Silently update milestone dates on server
    const res = await fetch(`/api/projects/${project.id}/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: mStart, endDate: mEnd }),
    })
    if (!res.ok) return
    setProject(prev => ({
      ...prev,
      milestones: prev.milestones.map(m =>
        m.id === milestoneId ? { ...m, startDate: mStart, endDate: mEnd } : m
      ),
    }))
  }, [project.id])

  const saveActivity = useCallback(async (milestoneId: string, data: any, existingId?: string) => {
    if (existingId) {
      const res = await fetch(`/api/projects/${project.id}/milestones/${milestoneId}/activities/${existingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) return
      const updated = await res.json()
      setProject(prev => {
        const newMilestones = prev.milestones.map(m =>
          m.id === milestoneId
            ? { ...m, activities: m.activities.map(a => a.id === existingId ? { ...a, ...updated } : a) }
            : m
        )
        // Auto-fill milestone dates from updated activities
        const milestone = newMilestones.find(m => m.id === milestoneId)
        if (milestone) autoFillMilestoneDates(milestoneId, milestone.activities)
        return { ...prev, milestones: newMilestones }
      })
    } else {
      const res = await fetch(`/api/projects/${project.id}/milestones/${milestoneId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) return
      const created = await res.json()
      setProject(prev => {
        const newMilestones = prev.milestones.map(m =>
          m.id === milestoneId
            ? { ...m, activities: [...m.activities, created] }
            : m
        )
        const milestone = newMilestones.find(m => m.id === milestoneId)
        if (milestone) autoFillMilestoneDates(milestoneId, milestone.activities)
        return { ...prev, milestones: newMilestones }
      })
    }
    setEditingId(null)
    setNewRow(null)
  }, [project.id, autoFillMilestoneDates])

  const deleteMilestone = useCallback(async (milestoneId: string) => {
    await fetch(`/api/projects/${project.id}/milestones/${milestoneId}`, { method: 'DELETE' })
    setProject(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== milestoneId),
    }))
  }, [project.id])

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

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setNewRow(null)
  }, [])

  const sm = STATUS_META[project.status] ?? STATUS_META.PLANNING

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex flex-col flex-1 px-4 py-4 md:px-6 md:py-5">
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
              {project.endDate && ` \u2192 ${format(new Date(project.endDate), 'd MMM yy')}`}
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
            setEditingId(null)
            setNewRow({ type: 'milestone' })
          }}
          onCollapseAll={collapseAll}
          onExpandAll={expandAll}
        />

        {/* Gantt chart with inline editing */}
        <GanttChart
          project={project}
          viewMode={viewMode}
          collapsed={collapsed}
          editingId={editingId}
          newRow={newRow}
          teams={teams}
          assets={assets}
          categories={categories}
          fillHeight
          onToggleCollapse={toggleCollapse}
          onStartEdit={(id) => { setNewRow(null); setEditingId(id) }}
          onCancelEdit={cancelEdit}
          onSaveMilestone={saveMilestone}
          onSaveActivity={saveActivity}
          onAddMilestone={() => { setEditingId(null); setNewRow({ type: 'milestone' }) }}
          onAddActivity={(milestoneId) => { setEditingId(null); setNewRow({ type: 'activity', milestoneId }) }}
          onDeleteMilestone={deleteMilestone}
          onDeleteActivity={deleteActivity}
        />

        {/* Empty state */}
        {project.milestones.length === 0 && !newRow && (
          <div className="card p-8 text-center mt-4">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-[13px] font-semibold text-ink mb-1">No milestones yet</div>
            <div className="text-xs text-ink-faint mb-4">Add milestones and activities to build your project timeline.</div>
            <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setNewRow({ type: 'milestone' })}>
              Add Milestone
            </Button>
          </div>
        )}
      </main>

      {/* Only project-level editing uses a modal */}
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
    </div>
  )
}
