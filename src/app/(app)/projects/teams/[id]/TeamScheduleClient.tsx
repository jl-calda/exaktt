// src/app/(app)/projects/teams/[id]/TeamScheduleClient.tsx
'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, differenceInDays, eachWeekOfInterval, startOfDay, addDays, subDays, min as minDate, max as maxDate } from 'date-fns'
import { ArrowLeft, Calendar } from 'lucide-react'
import TeamPill from '@/components/projects/TeamPill'

const ROW_H = 28
const COL_W = 120

type Activity = {
  id: string; name: string; status: string; color: string
  startDate?: string | null; endDate?: string | null
  milestone: { project: { id: string; name: string } }
}

type Member = { id: string; name?: string | null; avatarUrl?: string | null; skills: string[]; user?: any }

interface Props {
  team: {
    id: string; name: string
    members: Member[]
    activities: Activity[]
  }
}

export default function TeamScheduleClient({ team }: Props) {
  const router = useRouter()

  // Group activities by project
  const grouped = useMemo(() => {
    const map = new Map<string, { projectName: string; activities: Activity[] }>()
    team.activities.forEach(a => {
      const pid = a.milestone.project.id
      if (!map.has(pid)) map.set(pid, { projectName: a.milestone.project.name, activities: [] })
      map.get(pid)!.activities.push(a)
    })
    return Array.from(map.entries())
  }, [team.activities])

  // Date range
  const { rangeStart, rangeEnd, columns } = useMemo(() => {
    const allDates: Date[] = []
    team.activities.forEach(a => {
      if (a.startDate) allDates.push(new Date(a.startDate))
      if (a.endDate) allDates.push(new Date(a.endDate))
    })
    if (allDates.length === 0) {
      const today = startOfDay(new Date())
      allDates.push(subDays(today, 7), addDays(today, 30))
    }
    const start = subDays(startOfDay(minDate(allDates)), 3)
    const end = addDays(startOfDay(maxDate(allDates)), 7)
    const cols = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(d => ({
      date: d, label: format(d, 'd MMM'),
    }))
    return { rangeStart: start, rangeEnd: end, columns: cols }
  }, [team.activities])

  const totalW = columns.length * COL_W
  const totalDays = differenceInDays(rangeEnd, rangeStart) || 1

  const getBarPos = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start) return null
    const s = startOfDay(new Date(start))
    const e = end ? startOfDay(new Date(end)) : s
    const left = (differenceInDays(s, rangeStart) / totalDays) * totalW
    const width = Math.max(((differenceInDays(e, s) + 1) / totalDays) * totalW, 8)
    return { left, width }
  }

  // Build rows: project header + activity rows
  type Row = { type: 'project'; label: string } | { type: 'activity'; activity: Activity }
  const rows: Row[] = []
  grouped.forEach(([_, group]) => {
    rows.push({ type: 'project', label: group.projectName })
    group.activities.forEach(a => rows.push({ type: 'activity', activity: a }))
  })

  const totalH = rows.length * ROW_H

  return (
    <div className="min-h-full">
      <main className="px-4 py-4 md:px-6 md:py-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/projects/teams')} className="text-ink-faint hover:text-ink">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-semibold text-base text-ink">{team.name}</h1>
        </div>

        {/* Members */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          {team.members.map(m => (
            <div key={m.id} className="flex items-center gap-1.5 bg-surface-100 rounded-full px-2 py-1">
              <TeamPill assigneeName={m.name ?? m.user?.name} assignee={m.user} />
              <div className="flex gap-0.5">
                {m.skills.slice(0, 2).map(s => (
                  <span key={s} className="badge text-[8px] bg-surface-200 text-ink-faint">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Schedule Gantt */}
        {team.activities.length > 0 ? (
          <div className="card p-0 overflow-hidden">
            <div className="flex">
              {/* Left labels */}
              <div className="shrink-0 border-r border-surface-200" style={{ width: 200 }}>
                <div className="h-8 flex items-center px-3 border-b border-surface-200 bg-surface-100/60">
                  <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Schedule</span>
                </div>
                {rows.map((row, i) => (
                  <div key={i}
                    className="flex items-center px-3 border-b border-surface-100"
                    style={{ height: ROW_H, paddingLeft: row.type === 'activity' ? 16 : 8 }}>
                    {row.type === 'project' ? (
                      <span className="text-[11px] font-semibold text-ink truncate">{row.label}</span>
                    ) : (
                      <span className="text-[10px] text-ink-muted truncate">{row.activity.name}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Right chart */}
              <div className="flex-1 overflow-x-auto">
                <div className="flex border-b border-surface-200 bg-surface-100/60" style={{ height: 32, width: totalW }}>
                  {columns.map((col, i) => (
                    <div key={i} className="shrink-0 flex items-center justify-center border-r border-surface-100"
                      style={{ width: COL_W }}>
                      <span className="text-[10px] font-medium text-ink-muted">{col.label}</span>
                    </div>
                  ))}
                </div>
                <div className="relative" style={{ width: totalW, height: totalH }}>
                  {columns.map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-r border-surface-100"
                      style={{ left: i * COL_W }} />
                  ))}
                  {rows.map((row, i) => (
                    <div key={i} className="absolute left-0 right-0 border-b border-surface-100"
                      style={{ top: i * ROW_H, height: ROW_H }}>
                      {row.type === 'activity' && (() => {
                        const bar = getBarPos(row.activity.startDate, row.activity.endDate)
                        if (!bar) return null
                        return (
                          <div className="absolute top-1 rounded"
                            style={{
                              left: bar.left, width: bar.width, height: ROW_H - 8,
                              background: `${row.activity.color}30`,
                              border: `1px solid ${row.activity.color}50`,
                            }} />
                        )
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-8 text-center">
            <div className="text-2xl mb-2">📅</div>
            <div className="text-[13px] font-semibold text-ink mb-1">No activities assigned</div>
            <div className="text-xs text-ink-faint">Assign this team to project activities to see their schedule.</div>
          </div>
        )}
      </main>
    </div>
  )
}
