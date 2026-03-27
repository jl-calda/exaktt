// src/components/projects/GanttChart.tsx
'use client'
import { useMemo, useRef } from 'react'
import {
  format, differenceInDays, eachDayOfInterval, eachWeekOfInterval,
  eachMonthOfInterval, startOfDay, addDays, subDays, min as minDate,
  max as maxDate, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
} from 'date-fns'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import TeamPill from './TeamPill'

const ROW_H = 32
const LABEL_W = 220
const COL_WIDTHS = { days: 40, weeks: 120, months: 200 }

type Activity = {
  id: string; name: string; startDate?: string | null; endDate?: string | null
  status: string; progress: number; color: string
  isWithinDay?: boolean; startTime?: string | null; endTime?: string | null
  team?: any; assignee?: any; assigneeName?: string | null
}
type Milestone = {
  id: string; name: string; color: string
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
  onToggleCollapse: (id: string) => void
  onClickMilestone: (m: any) => void
  onClickActivity: (a: any, milestoneId: string) => void
  onAddActivity: (milestoneId: string) => void
  onDeleteMilestone: (milestoneId: string) => void
  onDeleteActivity: (milestoneId: string, activityId: string) => void
}

export default function GanttChart({
  project, viewMode, collapsed,
  onToggleCollapse, onClickMilestone, onClickActivity,
  onAddActivity, onDeleteMilestone, onDeleteActivity,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

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

  // Build rows
  type Row = {
    type: 'milestone' | 'activity'
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
    data: any
  }

  const rows: Row[] = []
  project.milestones.forEach(m => {
    const mBar = getBarPos(m.startDate, m.endDate)
    rows.push({
      type: 'milestone', id: m.id, label: m.name, color: m.color,
      bar: mBar, isCollapsed: collapsed.has(m.id), data: m,
    })
    if (!collapsed.has(m.id)) {
      m.activities.forEach(a => {
        const aBar = getBarPos(a.startDate, a.endDate)
        rows.push({
          type: 'activity', id: a.id, milestoneId: m.id,
          label: a.name, color: a.color, bar: aBar,
          progress: a.progress, team: a.team,
          assignee: a.assignee, assigneeName: a.assigneeName,
          isWithinDay: a.isWithinDay, startTime: a.startTime, endTime: a.endTime,
          data: a,
        })
      })
    }
  })

  const totalH = rows.length * ROW_H

  if (project.milestones.length === 0) return null

  return (
    <div className="card p-0 overflow-hidden mt-2">
      <div className="flex">
        {/* Left labels panel */}
        <div className="shrink-0 border-r border-surface-200" style={{ width: LABEL_W }}>
          {/* Header */}
          <div className="h-10 flex items-center px-3 border-b border-surface-200 bg-surface-100/60">
            <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Timeline</span>
          </div>
          {/* Rows */}
          {rows.map(row => (
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
                onClick={() => {
                  if (row.type === 'milestone') onClickMilestone(row.data)
                  else onClickActivity(row.data, row.milestoneId!)
                }}
              >
                {row.label}
              </span>
              {/* Team pill */}
              {row.type === 'activity' && (row.team || row.assigneeName) && (
                <TeamPill team={row.team} assigneeName={row.assigneeName} assignee={row.assignee} />
              )}
              {/* Actions */}
              <div className="opacity-0 group-hover/label:opacity-100 transition-opacity flex items-center gap-0.5">
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
          ))}
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
            {rows.map((row, i) => (
              <div key={row.id} className="absolute left-0 right-0 border-b border-surface-100"
                style={{ top: i * ROW_H, height: ROW_H }}>
                {row.bar && (
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
                    onClick={() => {
                      if (row.type === 'milestone') onClickMilestone(row.data)
                      else onClickActivity(row.data, row.milestoneId!)
                    }}
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
                        {row.startTime}{row.endTime ? `–${row.endTime}` : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
