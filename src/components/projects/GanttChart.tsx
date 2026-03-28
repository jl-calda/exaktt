// src/components/projects/GanttChart.tsx
'use client'
import { useMemo, useRef } from 'react'
import {
  format, differenceInDays, eachDayOfInterval, eachWeekOfInterval,
  eachMonthOfInterval, startOfDay, addDays, subDays, min as minDate,
  max as maxDate,
} from 'date-fns'
import { ChevronDown, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react'
import TeamPill from './TeamPill'
import InlineMilestoneForm from './InlineMilestoneForm'
import InlineActivityForm from './InlineActivityForm'
import { getMilestoneColor, getActivityColor, getDefaultMilestoneIcon, getDefaultActivityIcon } from './colors'

const ACTIVITY_ROW_H = 26
const MILESTONE_ROW_H = 32
const PROJECT_ROW_H = 42
const LABEL_W = 220
const EDIT_LABEL_W = 340
const COL_WIDTHS = { days: 40, weeks: 120, months: 200 }

type Activity = {
  id: string; name: string; description?: string | null; startDate?: string | null; endDate?: string | null
  status: string; progress: number; color: string
  isWithinDay?: boolean; startTime?: string | null; endTime?: string | null
  team?: any; assignee?: any; assigneeName?: string | null
  teamId?: string | null; assetIds?: string[]; skills?: string[]; requiredOutput?: string[]
  estimatedHours?: number | null
  icon?: string | null
}
type Milestone = {
  id: string; name: string; color: string; description?: string | null
  startDate?: string | null; endDate?: string | null
  activities: Activity[]
  icon?: string | null
}
type Project = {
  id: string; name: string
  clientName?: string | null; address?: string | null
  startDate?: string | null; endDate?: string | null
  milestones: Milestone[]
}

interface Props {
  // Single-project mode
  project?: Project
  // Multi-project mode (overview)
  projects?: Project[]
  viewMode: 'days' | 'weeks' | 'months'
  collapsed: Set<string>
  editingId: string | null
  newRow: { type: 'milestone' | 'activity'; milestoneId?: string } | null
  teams: any[]
  assets: any[]
  categories?: { id: string; name: string; color: string; isDefault: boolean }[]
  // Project-level collapse (multi-project mode)
  collapsedProjects?: Set<string>
  onToggleProjectCollapse?: (id: string) => void
  fillHeight?: boolean
  onToggleCollapse: (id: string) => void
  onStartEdit: (id: string) => void
  onCancelEdit: () => void
  onSaveMilestone: (data: any, existingId?: string) => Promise<void>
  onSaveActivity: (milestoneId: string, data: any, existingId?: string) => Promise<void>
  onAddMilestone: () => void
  onAddActivity: (milestoneId: string) => void
  onDeleteMilestone: (milestoneId: string) => void
  onDeleteActivity: (milestoneId: string, activityId: string) => void
}

export default function GanttChart({
  project, projects, viewMode, collapsed, editingId, newRow, teams, assets, categories,
  collapsedProjects, onToggleProjectCollapse, fillHeight,
  onToggleCollapse, onStartEdit, onCancelEdit,
  onSaveMilestone, onSaveActivity,
  onAddMilestone, onAddActivity, onDeleteMilestone, onDeleteActivity,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasEditing = editingId !== null || newRow !== null

  // Resolve project list
  const allProjects = useMemo(
    () => projects ?? (project ? [project] : []),
    [projects, project],
  )

  const { rangeStart, rangeEnd, columns } = useMemo(() => {
    const allDates: Date[] = []
    allProjects.forEach(p => {
      if (p.startDate) allDates.push(new Date(p.startDate))
      if (p.endDate) allDates.push(new Date(p.endDate))
      p.milestones.forEach(m => {
        if (m.startDate) allDates.push(new Date(m.startDate))
        if (m.endDate) allDates.push(new Date(m.endDate))
        m.activities.forEach(a => {
          if (a.startDate) allDates.push(new Date(a.startDate))
          if (a.endDate) allDates.push(new Date(a.endDate))
        })
      })
    })
    if (allDates.length === 0) {
      const today = startOfDay(new Date())
      allDates.push(subDays(today, 7), addDays(today, 30))
    }
    const earliest = startOfDay(minDate(allDates))
    const latest = startOfDay(maxDate(allDates))
    const start = subDays(earliest, 3)
    const end = addDays(latest, 7)

    let cols: { date: Date; label: string; subLabel?: string }[] = []
    if (viewMode === 'days') {
      cols = eachDayOfInterval({ start, end }).map(d => ({
        date: d, label: format(d, 'd'), subLabel: format(d, 'EEE'),
      }))
    } else if (viewMode === 'weeks') {
      cols = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(d => ({
        date: d, label: format(d, 'd MMM'), subLabel: `W${format(d, 'w')}`,
      }))
    } else {
      cols = eachMonthOfInterval({ start, end }).map(d => ({
        date: d, label: format(d, 'MMM yyyy'),
      }))
    }
    return { rangeStart: start, rangeEnd: end, columns: cols }
  }, [allProjects, viewMode])

  const colW = COL_WIDTHS[viewMode]
  const totalW = columns.length * colW

  const getBarPos = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start) return null
    const s = startOfDay(new Date(start))
    const e = end ? startOfDay(new Date(end)) : s
    const totalDays = differenceInDays(rangeEnd, rangeStart) || 1
    const left = (differenceInDays(s, rangeStart) / totalDays) * totalW
    const width = Math.max(((differenceInDays(e, s) + 1) / totalDays) * totalW, 8)
    return { left, width }
  }

  const today = startOfDay(new Date())
  const todayPos = (() => {
    const totalDays = differenceInDays(rangeEnd, rangeStart) || 1
    const pos = (differenceInDays(today, rangeStart) / totalDays) * totalW
    if (pos < 0 || pos > totalW) return null
    return pos
  })()

  // Build rows with project → milestone → activity hierarchy
  type Row = {
    type: 'project' | 'milestone' | 'activity' | 'new-milestone' | 'new-activity'
    id: string
    projectId?: string
    milestoneId?: string
    milestoneIndex?: number
    activityIndex?: number
    label: string
    color: string
    icon: string
    bar: { left: number; width: number } | null
    progress?: number
    team?: any
    assignee?: any
    assigneeName?: string | null
    isWithinDay?: boolean
    startTime?: string | null
    endTime?: string | null
    isCollapsed?: boolean
    isEditing?: boolean
    subtitle?: string | null
    data: any
  }

  const isMultiProject = allProjects.length > 1 || !!projects

  const rows: Row[] = []
  allProjects.forEach(p => {
    // Project row
    const pBar = getBarPos(p.startDate, p.endDate)
    const isProjectCollapsed = collapsedProjects?.has(p.id) ?? false
    const subtitle = [p.clientName, p.address].filter(Boolean).join(' · ') || null
    rows.push({
      type: 'project', id: `project-${p.id}`, projectId: p.id,
      label: p.name, subtitle, color: '#64748b', icon: '📊',
      bar: pBar, isCollapsed: isProjectCollapsed, data: p,
    })

    if (isProjectCollapsed) return

    p.milestones.forEach((m, mi) => {
      const mColor = getMilestoneColor(mi)
      const mBar = getBarPos(m.startDate, m.endDate)
      const mIcon = m.icon || getDefaultMilestoneIcon(mi)
      rows.push({
        type: 'milestone', id: m.id, projectId: p.id, milestoneIndex: mi,
        label: m.name, color: mColor, icon: mIcon,
        bar: mBar, isCollapsed: collapsed.has(m.id), isEditing: editingId === m.id, data: m,
      })
      if (!collapsed.has(m.id)) {
        m.activities.forEach((a, ai) => {
          const aColor = getActivityColor(mColor, ai)
          const aBar = getBarPos(a.startDate, a.endDate)
          const aIcon = a.icon || getDefaultActivityIcon(ai)
          rows.push({
            type: 'activity', id: a.id, projectId: p.id, milestoneId: m.id,
            milestoneIndex: mi, activityIndex: ai,
            label: a.name, color: aColor, icon: aIcon, bar: aBar,
            progress: a.progress, team: a.team,
            assignee: a.assignee, assigneeName: a.assigneeName,
            isWithinDay: a.isWithinDay, startTime: a.startTime, endTime: a.endTime,
            isEditing: editingId === a.id, data: a,
          })
        })
        if (newRow?.type === 'activity' && newRow.milestoneId === m.id) {
          const newAi = m.activities.length
          rows.push({
            type: 'new-activity', id: `new-activity-${m.id}`, projectId: p.id, milestoneId: m.id,
            milestoneIndex: mi, activityIndex: newAi,
            label: '', color: getActivityColor(mColor, newAi),
            icon: getDefaultActivityIcon(newAi),
            bar: null, data: null,
          })
        }
      }
    })
    if (newRow?.type === 'milestone') {
      const newMi = p.milestones.length
      rows.push({
        type: 'new-milestone', id: 'new-milestone', projectId: p.id,
        milestoneIndex: newMi,
        label: '', color: getMilestoneColor(newMi),
        icon: getDefaultMilestoneIcon(newMi),
        bar: null, data: null,
      })
    }
  })

  const labelW = hasEditing ? EDIT_LABEL_W : LABEL_W

  if (allProjects.every(p => p.milestones.length === 0) && !newRow) return null

  // Row indent levels
  const getIndent = (row: Row) => {
    if (row.type === 'project') return 8
    if (row.type === 'milestone' || row.type === 'new-milestone') return isMultiProject ? 24 : 8
    return isMultiProject ? 40 : 28
  }

  return (
    <div className={`card p-0 overflow-hidden mt-2 ${fillHeight ? 'min-h-[calc(100vh-280px)]' : ''}`}>
      {/* Header row */}
      <div className="flex border-b border-surface-200 bg-surface-100/60">
        <div className="shrink-0 h-10 flex items-center px-3 border-r border-surface-200 transition-all duration-300 ease-[var(--ease-spring)]"
          style={{ width: labelW }}>
          <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Timeline</span>
        </div>
        <div className="flex-1 overflow-x-auto" ref={scrollRef}>
          <div className="flex" style={{ width: totalW, height: 40 }}>
            {columns.map((col, i) => (
              <div key={i} className="shrink-0 flex flex-col items-center justify-center border-r border-surface-100"
                style={{ width: colW }}>
                <span className="text-[10px] text-ink-faint">{col.subLabel ?? ''}</span>
                <span className="text-[10px] font-medium text-ink-muted">{col.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data rows */}
      {rows.map((row) => {
        const isEditRow = row.isEditing || row.type === 'new-milestone' || row.type === 'new-activity'
        const isProject = row.type === 'project'
        const rowH = isProject ? PROJECT_ROW_H
          : (row.type === 'milestone' || row.type === 'new-milestone') ? MILESTONE_ROW_H
          : ACTIVITY_ROW_H

        return (
          <div key={row.id} className={`flex border-b ${isProject ? 'border-surface-200 bg-surface-100/30' : 'border-surface-100'}`}>
            {/* Left label / form */}
            <div className="shrink-0 border-r border-surface-200 transition-all duration-300 ease-[var(--ease-spring)]"
              style={{ width: labelW }}>

              {/* Edit form with smooth collapse */}
              {isEditRow ? (
                <div className="collapse-wrap open">
                  <div className="bg-surface-50 border-b border-surface-200/40">
                    {(row.type === 'milestone' || row.type === 'new-milestone') ? (
                      <InlineMilestoneForm
                        milestone={row.data}
                        defaultColor={row.color}
                        defaultIcon={row.icon}
                        onSave={async (data) => { await onSaveMilestone(data, row.data?.id) }}
                        onCancel={onCancelEdit}
                      />
                    ) : (
                      <InlineActivityForm
                        activity={row.data}
                        defaultColor={row.color}
                        defaultIcon={row.icon}
                        teams={teams}
                        assets={assets}
                        categories={categories}
                        onSave={async (data) => { await onSaveActivity(row.milestoneId!, data, row.data?.id) }}
                        onCancel={onCancelEdit}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-1.5 px-2 group/label transition-colors ${
                    isProject ? 'hover:bg-surface-100/60' : 'hover:bg-surface-100/50'
                  }`}
                  style={{ height: rowH, paddingLeft: getIndent(row) }}
                >
                  {/* Collapse chevron for projects and milestones */}
                  {(isProject && isMultiProject) && (
                    <button onClick={() => onToggleProjectCollapse?.(row.projectId!)} className="shrink-0 text-ink-faint hover:text-ink">
                      {row.isCollapsed
                        ? <ChevronRight className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {row.type === 'milestone' && (
                    <button onClick={() => onToggleCollapse(row.id)} className="shrink-0 text-ink-faint hover:text-ink">
                      {row.isCollapsed
                        ? <ChevronRight className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}

                  {/* Icon */}
                  <span className={`shrink-0 leading-none ${isProject ? 'text-sm' : 'text-xs'}`} title={row.icon}>{row.icon}</span>

                  {/* Color dot */}
                  {!isProject && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                  )}

                  {/* Label */}
                  <div
                    className={`truncate flex-1 min-w-0 ${!isProject ? 'cursor-pointer' : ''}`}
                    onClick={() => !isProject && onStartEdit(row.id)}
                  >
                    <span
                      className={`truncate block ${
                        isProject
                          ? 'text-xs font-bold text-ink'
                          : row.type === 'milestone'
                            ? 'text-[11px] font-semibold text-ink hover:text-primary'
                            : 'text-[11px] text-ink-muted hover:text-primary'
                      }`}
                    >
                      {row.label}
                    </span>
                    {isProject && row.subtitle && (
                      <span className="text-[10px] text-ink-faint truncate block leading-tight">{row.subtitle}</span>
                    )}
                  </div>

                  {/* Team pill on activities */}
                  {row.type === 'activity' && (row.team || row.assigneeName) && (
                    <TeamPill team={row.team} assigneeName={row.assigneeName} assignee={row.assignee} />
                  )}

                  {/* Actions */}
                  {!isProject && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Add activity — always visible on milestones */}
                      {row.type === 'milestone' && (
                        <button onClick={() => onAddActivity(row.id)} title="Add activity"
                          className="p-0.5 text-ink-faint hover:text-emerald-600 hover:bg-surface-200/60 rounded transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* Edit + Delete — hover on desktop, always visible on touch */}
                      <div className="md:opacity-0 md:group-hover/label:opacity-100 transition-opacity flex items-center gap-0.5">
                        <button onClick={() => onStartEdit(row.id)} title="Edit"
                          className="p-0.5 text-ink-faint hover:text-ink">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (row.type === 'milestone') onDeleteMilestone(row.id)
                            else onDeleteActivity(row.milestoneId!, row.id)
                          }}
                          title="Delete"
                          className="p-0.5 text-ink-faint hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right chart area */}
            <div className="flex-1 overflow-hidden">
              <div className="relative" style={{
                width: totalW,
                minHeight: isEditRow ? undefined : rowH,
                height: isEditRow ? '100%' : rowH,
              }}>
                {/* Grid lines */}
                {columns.map((_, ci) => (
                  <div key={ci} className="absolute top-0 bottom-0 border-r border-surface-100"
                    style={{ left: ci * colW, width: colW }} />
                ))}

                {/* Today line */}
                {todayPos !== null && (
                  <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10" style={{ left: todayPos }} />
                )}

                {/* Editing row tint */}
                {isEditRow && (
                  <div className="absolute inset-0 bg-primary/[0.03]" />
                )}

                {/* Bar — project / milestone / activity with solid colors */}
                {row.bar && !isEditRow && (
                  <div
                    className="absolute rounded cursor-pointer hover:brightness-110 transition-all"
                    style={{
                      left: row.bar.left,
                      width: row.bar.width,
                      top: isProject ? 11 : row.type === 'milestone' ? 9 : 9,
                      height: isProject ? 20 : row.type === 'milestone' ? 14 : 8,
                      background: isProject
                        ? '#64748bA0'
                        : row.type === 'milestone'
                          ? `${row.color}B0`
                          : `${row.color}90`,
                      border: isProject
                        ? '2px solid #64748bC0'
                        : row.type === 'milestone'
                          ? 'none'
                          : `1px solid ${row.color}C0`,
                      borderRadius: isProject ? 10 : row.type === 'milestone' ? 7 : 4,
                    }}
                    onClick={() => !isProject && onStartEdit(row.id)}
                  >
                    {/* Progress fill — fully opaque */}
                    {row.type === 'activity' && row.progress != null && row.progress > 0 && (
                      <div className="absolute inset-0 rounded"
                        style={{ width: `${row.progress}%`, background: row.color, opacity: 0.7, borderRadius: 'inherit' }} />
                    )}
                    {/* Time label for within-day activities */}
                    {row.isWithinDay && row.startTime && (
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-mono whitespace-nowrap text-white font-medium drop-shadow-sm">
                        {row.startTime}{row.endTime ? `\u2013${row.endTime}` : ''}
                      </span>
                    )}
                  </div>
                )}

                {/* Milestone resource markers */}
                {row.type === 'milestone' && row.bar && !isEditRow && (() => {
                  const acts = (row.data?.activities ?? []) as Activity[]
                  const teamNames = [...new Set(acts.map((a: Activity) => a.assigneeName || a.team?.name).filter(Boolean))]
                  const skillList = [...new Set(acts.flatMap((a: Activity) => a.skills ?? []))]
                  const aIds = [...new Set(acts.flatMap((a: Activity) => a.assetIds ?? []))]
                  const assetNames = aIds.map(id => assets.find((a: any) => a.id === id)?.name).filter(Boolean) as string[]
                  if (!teamNames.length && !skillList.length && !assetNames.length) return null

                  const tooltip = [
                    teamNames.length ? `Team: ${teamNames.join(', ')}` : '',
                    skillList.length ? `Skills: ${skillList.join(', ')}` : '',
                    assetNames.length ? `Assets: ${assetNames.join(', ')}` : '',
                  ].filter(Boolean).join('\n')

                  return (
                    <div
                      className="absolute flex items-center gap-0.5 z-[2] pointer-events-auto cursor-default"
                      style={{ left: row.bar.left + row.bar.width + 4, top: '50%', transform: 'translateY(-50%)' }}
                      title={tooltip}
                    >
                      {teamNames.length > 0 && (
                        <span className="text-[7px] px-1 h-3.5 rounded-full bg-blue-100/80 text-blue-600 inline-flex items-center gap-0.5 whitespace-nowrap">
                          👤 {teamNames.length}
                        </span>
                      )}
                      {skillList.length > 0 && (
                        <span className="text-[7px] px-1 h-3.5 rounded-full bg-surface-200/80 text-ink-faint inline-flex items-center gap-0.5 whitespace-nowrap">
                          🔧 {skillList.length}
                        </span>
                      )}
                      {assetNames.length > 0 && (
                        <span className="text-[7px] px-1 h-3.5 rounded-full bg-amber-100/80 text-amber-700 inline-flex items-center gap-0.5 whitespace-nowrap">
                          📦 {assetNames.length}
                        </span>
                      )}
                    </div>
                  )
                })()}

                {/* Dimmed bar for editing rows */}
                {row.bar && isEditRow && (
                  <div
                    className="absolute rounded opacity-40"
                    style={{
                      left: row.bar.left, width: row.bar.width,
                      top: 4, bottom: 4,
                      background: `${row.color}30`,
                      border: `1px dashed ${row.color}80`,
                      borderRadius: 9999,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
