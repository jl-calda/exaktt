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

const ROW_H = 32
const EDIT_MILESTONE_H = 120
const EDIT_ACTIVITY_H = 180
const LABEL_W = 220
const EDIT_LABEL_W = 420
const COL_WIDTHS = { days: 40, weeks: 120, months: 200 }

type Activity = {
  id: string; name: string; description?: string | null; startDate?: string | null; endDate?: string | null
  status: string; progress: number; color: string
  isWithinDay?: boolean; startTime?: string | null; endTime?: string | null
  team?: any; assignee?: any; assigneeName?: string | null
  teamId?: string | null; assetIds?: string[]; skills?: string[]; requiredOutput?: string[]
}
type Milestone = {
  id: string; name: string; color: string; description?: string | null
  startDate?: string | null; endDate?: string | null
  activities: Activity[]
}
type Project = {
  id: string; name: string
  startDate?: string | null; endDate?: string | null
  milestones: Milestone[]
}

interface Props {
  project: Project
  viewMode: 'days' | 'weeks' | 'months'
  collapsed: Set<string>
  editingId: string | null
  newRow: { type: 'milestone' | 'activity'; milestoneId?: string } | null
  teams: any[]
  assets: any[]
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
  project, viewMode, collapsed, editingId, newRow, teams, assets,
  onToggleCollapse, onStartEdit, onCancelEdit,
  onSaveMilestone, onSaveActivity,
  onAddMilestone, onAddActivity, onDeleteMilestone, onDeleteActivity,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Any row being edited?
  const hasEditing = editingId !== null || newRow !== null

  // Compute date range from all items
  const { rangeStart, rangeEnd, columns } = useMemo(() => {
    const allDates: Date[] = []
    if (project.startDate) allDates.push(new Date(project.startDate))
    if (project.endDate) allDates.push(new Date(project.endDate))
    project.milestones.forEach(m => {
      if (m.startDate) allDates.push(new Date(m.startDate))
      if (m.endDate) allDates.push(new Date(m.endDate))
      m.activities.forEach(a => {
        if (a.startDate) allDates.push(new Date(a.startDate))
        if (a.endDate) allDates.push(new Date(a.endDate))
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
  }, [project, viewMode])

  const colW = COL_WIDTHS[viewMode]
  const totalW = columns.length * colW

  // Compute bar position
  const getBarPos = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start) return null
    const s = startOfDay(new Date(start))
    const e = end ? startOfDay(new Date(end)) : s
    const totalDays = differenceInDays(rangeEnd, rangeStart) || 1
    const left = (differenceInDays(s, rangeStart) / totalDays) * totalW
    const width = Math.max(((differenceInDays(e, s) + 1) / totalDays) * totalW, 8)
    return { left, width }
  }

  // Today line position
  const today = startOfDay(new Date())
  const todayPos = (() => {
    const totalDays = differenceInDays(rangeEnd, rangeStart) || 1
    const pos = (differenceInDays(today, rangeStart) / totalDays) * totalW
    if (pos < 0 || pos > totalW) return null
    return pos
  })()

  // Build rows with editing support
  type Row = {
    type: 'milestone' | 'activity' | 'new-milestone' | 'new-activity'
    id: string
    milestoneId?: string
    label: string
    color: string
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
    data: any
  }

  const rows: Row[] = []
  project.milestones.forEach(m => {
    const mBar = getBarPos(m.startDate, m.endDate)
    const isEditingThis = editingId === m.id
    rows.push({
      type: 'milestone', id: m.id, label: m.name, color: m.color,
      bar: mBar, isCollapsed: collapsed.has(m.id), isEditing: isEditingThis, data: m,
    })
    if (!collapsed.has(m.id)) {
      m.activities.forEach(a => {
        const aBar = getBarPos(a.startDate, a.endDate)
        const isEditingAct = editingId === a.id
        rows.push({
          type: 'activity', id: a.id, milestoneId: m.id,
          label: a.name, color: a.color, bar: aBar,
          progress: a.progress, team: a.team,
          assignee: a.assignee, assigneeName: a.assigneeName,
          isWithinDay: a.isWithinDay, startTime: a.startTime, endTime: a.endTime,
          isEditing: isEditingAct, data: a,
        })
      })
      // Insert new activity row at end of this milestone's activities
      if (newRow?.type === 'activity' && newRow.milestoneId === m.id) {
        rows.push({
          type: 'new-activity', id: `new-activity-${m.id}`, milestoneId: m.id,
          label: '', color: '', bar: null, data: null,
        })
      }
    }
  })
  // Insert new milestone row at end
  if (newRow?.type === 'milestone') {
    rows.push({
      type: 'new-milestone', id: 'new-milestone',
      label: '', color: '', bar: null, data: null,
    })
  }

  // Compute row heights and cumulative tops
  const rowHeights = rows.map(row => {
    if (row.isEditing && row.type === 'milestone') return EDIT_MILESTONE_H
    if (row.isEditing && row.type === 'activity') return EDIT_ACTIVITY_H
    if (row.type === 'new-milestone') return EDIT_MILESTONE_H
    if (row.type === 'new-activity') return EDIT_ACTIVITY_H
    return ROW_H
  })
  const rowTops: number[] = []
  let cumTop = 0
  for (const h of rowHeights) {
    rowTops.push(cumTop)
    cumTop += h
  }
  const totalH = cumTop

  const labelW = hasEditing ? EDIT_LABEL_W : LABEL_W

  if (project.milestones.length === 0 && !newRow) return null

  return (
    <div className="card p-0 overflow-hidden mt-2">
      <div className="flex">
        {/* Left labels panel */}
        <div className="shrink-0 border-r border-surface-200 transition-all duration-200" style={{ width: labelW }}>
          {/* Header */}
          <div className="h-10 flex items-center px-3 border-b border-surface-200 bg-surface-100/60">
            <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Timeline</span>
          </div>
          {/* Rows */}
          {rows.map((row, i) => {
            const isEditRow = row.isEditing || row.type === 'new-milestone' || row.type === 'new-activity'

            // Editing row — render inline form
            if (isEditRow) {
              const rowType = row.type === 'new-milestone' ? 'milestone'
                            : row.type === 'new-activity' ? 'activity'
                            : row.type
              if (rowType === 'milestone') {
                return (
                  <div key={row.id} className="border-b border-surface-200 bg-surface-50"
                    style={{ height: rowHeights[i] }}>
                    <InlineMilestoneForm
                      milestone={row.data}
                      defaultColor={row.data?.color ?? '#3b82f6'}
                      onSave={async (data) => {
                        await onSaveMilestone(data, row.data?.id)
                      }}
                      onCancel={onCancelEdit}
                    />
                  </div>
                )
              }
              return (
                <div key={row.id} className="border-b border-surface-200 bg-surface-50"
                  style={{ height: rowHeights[i] }}>
                  <InlineActivityForm
                    activity={row.data}
                    defaultColor={row.data?.color ?? '#10b981'}
                    teams={teams}
                    assets={assets}
                    onSave={async (data) => {
                      await onSaveActivity(row.milestoneId!, data, row.data?.id)
                    }}
                    onCancel={onCancelEdit}
                  />
                </div>
              )
            }

            // Display row
            return (
              <div key={row.id}
                className="flex items-center gap-1.5 px-2 border-b border-surface-100 group/label hover:bg-surface-100/50"
                style={{ height: ROW_H, paddingLeft: row.type === 'activity' ? 28 : 8 }}
              >
                {row.type === 'milestone' && (
                  <button onClick={() => onToggleCollapse(row.id)} className="shrink-0 text-ink-faint hover:text-ink">
                    {row.isCollapsed
                      ? <ChevronRight className="w-3 h-3" />
                      : <ChevronDown className="w-3 h-3" />
                    }
                  </button>
                )}
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                <span
                  className={`text-[11px] truncate flex-1 cursor-pointer hover:text-primary ${
                    row.type === 'milestone' ? 'font-semibold text-ink' : 'text-ink-muted'
                  }`}
                  onClick={() => onStartEdit(row.id)}
                >
                  {row.label}
                </span>
                {/* Team pill */}
                {row.type === 'activity' && (row.team || row.assigneeName) && (
                  <TeamPill team={row.team} assigneeName={row.assigneeName} assignee={row.assignee} />
                )}
                {/* Actions */}
                <div className="opacity-0 group-hover/label:opacity-100 transition-opacity flex items-center gap-0.5">
                  <button onClick={() => onStartEdit(row.id)} title="Edit"
                    className="p-0.5 text-ink-faint hover:text-ink">
                    <Pencil className="w-3 h-3" />
                  </button>
                  {row.type === 'milestone' && (
                    <button onClick={() => onAddActivity(row.id)} title="Add activity"
                      className="p-0.5 text-ink-faint hover:text-emerald-600">
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
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
            )
          })}
        </div>

        {/* Right scrollable chart */}
        <div className="flex-1 overflow-x-auto" ref={scrollRef}>
          {/* Column headers */}
          <div className="flex border-b border-surface-200 bg-surface-100/60" style={{ height: 40, width: totalW }}>
            {columns.map((col, i) => (
              <div key={i} className="shrink-0 flex flex-col items-center justify-center border-r border-surface-100"
                style={{ width: colW }}>
                <span className="text-[10px] text-ink-faint">{col.subLabel ?? ''}</span>
                <span className="text-[10px] font-medium text-ink-muted">{col.label}</span>
              </div>
            ))}
          </div>

          {/* Chart body */}
          <div className="relative" style={{ width: totalW, height: totalH }}>
            {/* Grid lines */}
            {columns.map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 border-r border-surface-100"
                style={{ left: i * colW, width: colW }} />
            ))}

            {/* Today line */}
            {todayPos !== null && (
              <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10" style={{ left: todayPos }}>
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-red-400 text-white text-[8px] px-1 rounded-b">
                  Today
                </div>
              </div>
            )}

            {/* Row backgrounds + bars */}
            {rows.map((row, i) => {
              const isEditRow = row.isEditing || row.type === 'new-milestone' || row.type === 'new-activity'

              return (
                <div key={row.id} className="absolute left-0 right-0 border-b border-surface-100"
                  style={{ top: rowTops[i], height: rowHeights[i] }}>
                  {/* For editing rows, show a subtle background */}
                  {isEditRow && (
                    <div className="absolute inset-0 bg-primary/[0.03]" />
                  )}
                  {/* Bar */}
                  {row.bar && !isEditRow && (
                    <div
                      className="absolute top-1.5 rounded cursor-pointer hover:brightness-95 transition-all"
                      style={{
                        left: row.bar.left,
                        width: row.bar.width,
                        height: row.type === 'milestone' ? ROW_H - 12 : ROW_H - 14,
                        background: row.type === 'milestone'
                          ? `${row.color}30`
                          : `${row.color}25`,
                        border: `1px solid ${row.color}50`,
                        borderRadius: row.type === 'milestone' ? 6 : 4,
                      }}
                      onClick={() => onStartEdit(row.id)}
                    >
                      {/* Progress fill for activities */}
                      {row.type === 'activity' && row.progress != null && row.progress > 0 && (
                        <div className="absolute inset-0 rounded"
                          style={{
                            width: `${row.progress}%`,
                            background: `${row.color}50`,
                            borderRadius: 'inherit',
                          }}
                        />
                      )}
                      {/* Time label for within-day */}
                      {row.isWithinDay && row.startTime && (
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-mono whitespace-nowrap"
                          style={{ color: row.color }}>
                          {row.startTime}{row.endTime ? `\u2013${row.endTime}` : ''}
                        </span>
                      )}
                    </div>
                  )}
                  {/* For editing rows, show the bar if it exists (dimmed) */}
                  {row.bar && isEditRow && (
                    <div
                      className="absolute rounded opacity-40"
                      style={{
                        left: row.bar.left,
                        width: row.bar.width,
                        top: 4,
                        height: rowHeights[i] - 8,
                        background: `${row.color}20`,
                        border: `1px dashed ${row.color}60`,
                        borderRadius: 6,
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
