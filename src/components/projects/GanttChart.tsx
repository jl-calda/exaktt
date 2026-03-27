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

const ROW_H = 32
const LABEL_W = 220
const EDIT_LABEL_W = 460
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
  const hasEditing = editingId !== null || newRow !== null

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

  // Build rows with auto-assigned colors
  type Row = {
    type: 'milestone' | 'activity' | 'new-milestone' | 'new-activity'
    id: string
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
    data: any
  }

  const rows: Row[] = []
  project.milestones.forEach((m, mi) => {
    const mColor = getMilestoneColor(mi)
    const mBar = getBarPos(m.startDate, m.endDate)
    const mIcon = m.icon || getDefaultMilestoneIcon(mi)
    rows.push({
      type: 'milestone', id: m.id, milestoneIndex: mi,
      label: m.name, color: mColor, icon: mIcon,
      bar: mBar, isCollapsed: collapsed.has(m.id), isEditing: editingId === m.id, data: m,
    })
    if (!collapsed.has(m.id)) {
      m.activities.forEach((a, ai) => {
        const aColor = getActivityColor(mColor, ai)
        const aBar = getBarPos(a.startDate, a.endDate)
        const aIcon = a.icon || getDefaultActivityIcon(ai)
        rows.push({
          type: 'activity', id: a.id, milestoneId: m.id,
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
          type: 'new-activity', id: `new-activity-${m.id}`, milestoneId: m.id,
          milestoneIndex: mi, activityIndex: newAi,
          label: '', color: getActivityColor(mColor, newAi),
          icon: getDefaultActivityIcon(newAi),
          bar: null, data: null,
        })
      }
    }
  })
  if (newRow?.type === 'milestone') {
    const newMi = project.milestones.length
    rows.push({
      type: 'new-milestone', id: 'new-milestone',
      milestoneIndex: newMi,
      label: '', color: getMilestoneColor(newMi),
      icon: getDefaultMilestoneIcon(newMi),
      bar: null, data: null,
    })
  }

  const labelW = hasEditing ? EDIT_LABEL_W : LABEL_W

  if (project.milestones.length === 0 && !newRow) return null

  return (
    <div className="card p-0 overflow-hidden mt-2">
      {/* Header row */}
      <div className="flex border-b border-surface-200 bg-surface-100/60">
        <div className="shrink-0 h-10 flex items-center px-3 border-r border-surface-200 transition-all duration-200"
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

      {/* Data rows — each row is a flex container so left and right heights auto-sync */}
      {rows.map((row) => {
        const isEditRow = row.isEditing || row.type === 'new-milestone' || row.type === 'new-activity'

        return (
          <div key={row.id} className="flex border-b border-surface-100">
            {/* Left label / form */}
            <div className="shrink-0 border-r border-surface-200 transition-all duration-200"
              style={{ width: labelW }}>
              {isEditRow ? (
                <div className="bg-surface-50">
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
                      onSave={async (data) => { await onSaveActivity(row.milestoneId!, data, row.data?.id) }}
                      onCancel={onCancelEdit}
                    />
                  )}
                </div>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-2 group/label hover:bg-surface-100/50"
                  style={{ height: ROW_H, paddingLeft: row.type === 'activity' ? 28 : 8 }}
                >
                  {row.type === 'milestone' && (
                    <button onClick={() => onToggleCollapse(row.id)} className="shrink-0 text-ink-faint hover:text-ink">
                      {row.isCollapsed
                        ? <ChevronRight className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                  <span className="text-xs shrink-0 leading-none" title={row.icon}>{row.icon}</span>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                  <span
                    className={`text-[11px] truncate flex-1 cursor-pointer hover:text-primary ${
                      row.type === 'milestone' ? 'font-semibold text-ink' : 'text-ink-muted'
                    }`}
                    onClick={() => onStartEdit(row.id)}
                  >
                    {row.label}
                  </span>
                  {row.type === 'activity' && (row.team || row.assigneeName) && (
                    <TeamPill team={row.team} assigneeName={row.assigneeName} assignee={row.assignee} />
                  )}
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
              )}
            </div>

            {/* Right chart area */}
            <div className="flex-1 overflow-hidden">
              <div className="relative" style={{ width: totalW, minHeight: isEditRow ? undefined : ROW_H, height: isEditRow ? '100%' : ROW_H }}>
                {/* Grid lines */}
                {columns.map((_, ci) => (
                  <div key={ci} className="absolute top-0 bottom-0 border-r border-surface-100"
                    style={{ left: ci * colW, width: colW }} />
                ))}

                {/* Today line */}
                {todayPos !== null && (
                  <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10" style={{ left: todayPos }} />
                )}

                {/* Editing row background */}
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
                      background: row.type === 'milestone' ? `${row.color}30` : `${row.color}25`,
                      border: `1px solid ${row.color}50`,
                      borderRadius: row.type === 'milestone' ? 6 : 4,
                    }}
                    onClick={() => onStartEdit(row.id)}
                  >
                    {row.type === 'activity' && row.progress != null && row.progress > 0 && (
                      <div className="absolute inset-0 rounded"
                        style={{ width: `${row.progress}%`, background: `${row.color}50`, borderRadius: 'inherit' }} />
                    )}
                    {row.isWithinDay && row.startTime && (
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-mono whitespace-nowrap"
                        style={{ color: row.color }}>
                        {row.startTime}{row.endTime ? `\u2013${row.endTime}` : ''}
                      </span>
                    )}
                  </div>
                )}

                {/* Dimmed bar for editing rows */}
                {row.bar && isEditRow && (
                  <div
                    className="absolute rounded opacity-40"
                    style={{
                      left: row.bar.left, width: row.bar.width,
                      top: 4, bottom: 4,
                      background: `${row.color}20`,
                      border: `1px dashed ${row.color}60`,
                      borderRadius: 6,
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
