// src/app/(app)/projects/overview/OverviewClient.tsx
'use client'
import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Layers, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import GanttChart from '@/components/projects/GanttChart'
import GanttToolbar from '@/components/projects/GanttToolbar'

const STATUS_META: Record<string, { label: string; color: string }> = {
  PLANNING:  { label: 'Planning',  color: '#64748b' },
  ACTIVE:    { label: 'Active',    color: '#16a34a' },
  ON_HOLD:   { label: 'On Hold',   color: '#d97706' },
  COMPLETED: { label: 'Completed', color: '#2563eb' },
  CANCELLED: { label: 'Cancelled', color: '#9ca3af' },
}

type Project = {
  id: string
  name: string
  clientName?: string | null
  status: string
  startDate?: string | null
  endDate?: string | null
  milestones: {
    id: string; name: string; color: string
    startDate?: string | null; endDate?: string | null
    activities: {
      id: string; name: string; startDate?: string | null; endDate?: string | null
      status: string; progress: number; color: string
      isWithinDay?: boolean; startTime?: string | null; endTime?: string | null
      team?: any; assignee?: any; assigneeName?: string | null
    }[]
  }[]
}

interface Props {
  projects: Project[]
  teams: any[]
}

export default function OverviewClient({ projects }: Props) {
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months'>('weeks')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set())

  const filtered = useMemo(
    () => statusFilter ? projects.filter(p => p.status === statusFilter) : projects,
    [projects, statusFilter],
  )

  const toggleProject = useCallback((id: string) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleItem = useCallback((id: string) => {
    setCollapsedItems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const collapseAll = useCallback(() => {
    setCollapsedProjects(new Set(filtered.map(p => p.id)))
  }, [filtered])

  const expandAll = useCallback(() => {
    setCollapsedProjects(new Set())
    setCollapsedItems(new Set())
  }, [])

  // No-op handlers for overview (read-only)
  const noop = useCallback(() => {}, [])
  const noopAsync = useCallback(async () => {}, [])

  return (
    <div className="min-h-full">
      <main className="px-4 py-4 md:px-6 md:py-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/projects">
              <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
                Projects
              </Button>
            </Link>
            <h1 className="font-semibold text-base text-ink">Projects Overview</h1>
            <span className="text-[10px] text-ink-faint">
              {filtered.length} project{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          <GanttToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onCollapseAll={collapseAll}
            onExpandAll={expandAll}
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <Filter className="w-3 h-3 text-ink-faint" />
          <button onClick={() => setStatusFilter(null)}
            className={`filter-pill ${!statusFilter ? 'active' : ''}`}>
            All
          </button>
          {['ACTIVE', 'PLANNING', 'ON_HOLD', 'COMPLETED'].map(st => (
            <button key={st}
              onClick={() => setStatusFilter(statusFilter === st ? null : st)}
              className={`filter-pill ${statusFilter === st ? 'active' : ''}`}>
              {STATUS_META[st].label}
            </button>
          ))}
        </div>

        {/* Stacked Gantt */}
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Layers className="w-10 h-10 text-ink-faint mx-auto mb-3" />
            <h3 className="text-[13px] font-medium text-ink mb-1">No projects to display</h3>
            <p className="text-[11px] text-ink-faint">
              Create projects or adjust the filter to see the overview Gantt.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(project => {
              const isCollapsed = collapsedProjects.has(project.id)
              const meta = STATUS_META[project.status] ?? STATUS_META.PLANNING

              return (
                <div key={project.id} className="card overflow-hidden">
                  {/* Project header */}
                  <button
                    onClick={() => toggleProject(project.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 bg-surface-100/80 border-b border-surface-200/60 hover:bg-surface-100 transition-colors text-left"
                  >
                    <span className="text-ink-faint">
                      {isCollapsed
                        ? <span className="text-[10px]">&#9654;</span>
                        : <span className="text-[10px]">&#9660;</span>}
                    </span>
                    <span className="font-semibold text-xs text-ink flex-1">{project.name}</span>
                    {project.clientName && (
                      <span className="text-[10px] text-ink-faint">{project.clientName}</span>
                    )}
                    <span className="badge text-[10px]" style={{ background: meta.color + '18', color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-ink-faint">
                      {project.milestones.length} milestone{project.milestones.length !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {/* Gantt body */}
                  {!isCollapsed && (
                    <div className="animate-fade-in">
                      <GanttChart
                        project={project}
                        viewMode={viewMode}
                        collapsed={collapsedItems}
                        editingId={null}
                        newRow={null}
                        teams={[]}
                        assets={[]}
                        onToggleCollapse={toggleItem}
                        onStartEdit={noop}
                        onCancelEdit={noop}
                        onSaveMilestone={noopAsync}
                        onSaveActivity={noopAsync}
                        onAddMilestone={noop}
                        onAddActivity={noop}
                        onDeleteMilestone={noop}
                        onDeleteActivity={noop}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
