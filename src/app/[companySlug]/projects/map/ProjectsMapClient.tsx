// src/app/(app)/projects/map/ProjectsMapClient.tsx
'use client'
import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { format, isSameDay, isWithinInterval, addDays, differenceInDays, startOfMonth, eachMonthOfInterval } from 'date-fns'
import { MapPin, Filter, Calendar, Users, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { MapProject } from '@/components/projects/MapView'

/* Lazy-load map to avoid SSR issues with Leaflet */
const MapView = dynamic(() => import('@/components/projects/MapView'), { ssr: false })

const STATUS_META: Record<string, { label: string; color: string }> = {
  PLANNING:  { label: 'Planning',  color: '#64748b' },
  ACTIVE:    { label: 'Active',    color: '#16a34a' },
  ON_HOLD:   { label: 'On Hold',   color: '#d97706' },
  COMPLETED: { label: 'Completed', color: '#2563eb' },
  CANCELLED: { label: 'Cancelled', color: '#9ca3af' },
}

type Activity = {
  id: string; name: string; status: string
  startDate?: string | null; endDate?: string | null
  teamId?: string | null; team?: { id: string; name: string } | null
  assignee?: { id: string; name: string } | null
  assigneeName?: string | null
  skills?: string[]; assetIds?: string[]
}

type Project = {
  id: string; name: string; clientName?: string | null
  address?: string | null; status: string
  latitude?: number | null; longitude?: number | null
  startDate?: string | null; endDate?: string | null
  contractValue: number
  milestones: { activities: Activity[] }[]
}

interface Props {
  projects: Project[]
  teams: { id: string; name: string; members: any[] }[]
  assets: { id: string; name: string; category?: string | null }[]
}

function getProjectActivities(p: Project): Activity[] {
  return p.milestones.flatMap(m => m.activities)
}

function getProjectTeams(p: Project): string[] {
  const names = new Set<string>()
  for (const a of getProjectActivities(p)) {
    if (a.team?.name) names.add(a.team.name)
  }
  return Array.from(names)
}

function getProjectSkills(p: Project): string[] {
  const skills = new Set<string>()
  for (const a of getProjectActivities(p)) {
    for (const s of (a.skills ?? [])) skills.add(s)
  }
  return Array.from(skills)
}

function getProjectAssetIds(p: Project): string[] {
  const ids = new Set<string>()
  for (const a of getProjectActivities(p)) {
    for (const id of (a.assetIds ?? [])) ids.add(id)
  }
  return Array.from(ids)
}

/** Check if a project has any activity overlapping a given date */
function hasActivityOnDate(p: Project, date: Date): boolean {
  return getProjectActivities(p).some(a => {
    if (!a.startDate && !a.endDate) return false
    const start = a.startDate ? new Date(a.startDate) : null
    const end = a.endDate ? new Date(a.endDate) : null
    if (start && end) return isWithinInterval(date, { start, end })
    if (start) return isSameDay(date, start) || date >= start
    if (end) return isSameDay(date, end) || date <= end
    return false
  })
}

/** Get teams active on a specific date at a project */
function getTeamsOnDate(p: Project, date: Date): string[] {
  const names = new Set<string>()
  for (const a of getProjectActivities(p)) {
    if (!a.startDate && !a.endDate) continue
    const start = a.startDate ? new Date(a.startDate) : null
    const end = a.endDate ? new Date(a.endDate) : null
    const inRange = (start && end)
      ? isWithinInterval(date, { start, end })
      : start ? (isSameDay(date, start) || date >= start)
      : end ? (isSameDay(date, end) || date <= end)
      : false
    if (inRange && a.team?.name) names.add(a.team.name)
  }
  return Array.from(names)
}

export default function ProjectsMapClient({ projects, teams, assets }: Props) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [timelineDate, setTimelineDate] = useState<string>('')
  const [timelineActive, setTimelineActive] = useState(false)

  const assetMap = useMemo(() => {
    const m = new Map<string, string>()
    assets.forEach(a => m.set(a.id, a.name))
    return m
  }, [assets])

  const geoProjects = useMemo(
    () => projects.filter(p => p.latitude != null && p.longitude != null),
    [projects],
  )

  const filtered = useMemo(
    () => statusFilter ? geoProjects.filter(p => p.status === statusFilter) : geoProjects,
    [geoProjects, statusFilter],
  )

  // Enrich projects for map markers
  const mapProjects: MapProject[] = useMemo(
    () => filtered.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      latitude: p.latitude,
      longitude: p.longitude,
      address: p.address,
      teams: getProjectTeams(p),
      skills: getProjectSkills(p),
      assetNames: getProjectAssetIds(p).map(id => assetMap.get(id)).filter(Boolean) as string[],
    })),
    [filtered, assetMap],
  )

  // Timeline filtering — which projects are dimmed (no activity on selected date)
  const dimmedIds = useMemo(() => {
    if (!timelineActive || !timelineDate) return undefined
    const date = new Date(timelineDate)
    const dimmed = new Set<string>()
    filtered.forEach(p => {
      if (!hasActivityOnDate(p, date)) dimmed.add(p.id)
    })
    return dimmed
  }, [timelineActive, timelineDate, filtered])

  // Team locations on selected date
  const teamLocations = useMemo(() => {
    if (!timelineActive || !timelineDate) return []
    const date = new Date(timelineDate)
    const locations: { teamName: string; projectName: string; projectId: string }[] = []
    filtered.forEach(p => {
      const teamsOnDate = getTeamsOnDate(p, date)
      teamsOnDate.forEach(t => locations.push({ teamName: t, projectName: p.name, projectId: p.id }))
    })
    return locations
  }, [timelineActive, timelineDate, filtered])

  const selectedProject = useMemo(
    () => projects.find(p => p.id === selected),
    [projects, selected],
  )

  const noGeoCount = projects.length - geoProjects.length

  // Compute date range from all activity dates for the slider
  const dateRange = useMemo(() => {
    let min: Date | null = null
    let max: Date | null = null
    projects.forEach(p => {
      p.milestones.forEach(m => {
        m.activities.forEach(a => {
          if (a.startDate) {
            const d = new Date(a.startDate)
            if (!min || d < min) min = d
            if (!max || d > max) max = d
          }
          if (a.endDate) {
            const d = new Date(a.endDate)
            if (!min || d < min) min = d
            if (!max || d > max) max = d
          }
        })
      })
    })
    if (!min || !max) {
      // Fallback: 1 year centered on today
      const today = new Date()
      min = addDays(today, -30)
      max = addDays(today, 335)
    }
    // Add padding
    min = addDays(min!, -7)
    max = addDays(max!, 7)
    const totalDays = differenceInDays(max, min)
    return { min: min!, max: max!, totalDays }
  }, [projects])

  // Month labels for slider
  const monthLabels = useMemo(() => {
    const months = eachMonthOfInterval({ start: dateRange.min, end: dateRange.max })
    return months.map(m => ({
      label: format(m, 'MMM'),
      year: format(m, 'yy'),
      pct: (differenceInDays(m, dateRange.min) / dateRange.totalDays) * 100,
    }))
  }, [dateRange])

  // Slider value (day offset from min)
  const sliderValue = useMemo(() => {
    if (!timelineDate) return Math.round(dateRange.totalDays / 2)
    return differenceInDays(new Date(timelineDate), dateRange.min)
  }, [timelineDate, dateRange])

  const handleSliderChange = useCallback((value: number) => {
    const d = addDays(dateRange.min, value)
    setTimelineDate(format(d, 'yyyy-MM-dd'))
  }, [dateRange])

  // Today position on slider
  const todayOffset = useMemo(() => {
    const d = differenceInDays(new Date(), dateRange.min)
    return Math.max(0, Math.min(dateRange.totalDays, d))
  }, [dateRange])

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 md:px-6 flex items-center justify-between border-b border-surface-200 bg-surface-50">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-sm text-ink">Project Map</h1>
          <span className="text-[10px] text-ink-faint">
            {filtered.length} project{filtered.length !== 1 ? 's' : ''} on map
            {noGeoCount > 0 && ` · ${noGeoCount} without location`}
          </span>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-ink-faint" />
          <button
            onClick={() => setStatusFilter(null)}
            className={`filter-pill ${!statusFilter ? 'active' : ''}`}
          >
            All
          </button>
          {['ACTIVE', 'PLANNING', 'ON_HOLD', 'COMPLETED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(statusFilter === st ? null : st)}
              className={`filter-pill ${statusFilter === st ? 'active' : ''}`}
            >
              {STATUS_META[st].label}
            </button>
          ))}
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="flex-1 flex relative" style={{ minHeight: 'calc(100vh - 160px)' }}>
        {/* Map */}
        <div className="flex-1 relative">
          {filtered.length > 0 ? (
            <MapView
              projects={mapProjects}
              selectedId={selected}
              onSelect={setSelected}
              dimmedIds={dimmedIds}
            />
          ) : (
            <div className="flex-1 h-full flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-10 h-10 text-ink-faint mx-auto mb-3" />
                <h3 className="text-[13px] font-medium text-ink mb-1">No projects with locations</h3>
                <p className="text-[11px] text-ink-faint">
                  Add latitude and longitude to your projects to see them on the map.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Selected project sidebar */}
        {selectedProject && (
          <div className="w-80 border-l border-surface-200 bg-surface-50 p-4 overflow-y-auto animate-slide-in-right">
            <div className="flex items-start justify-between mb-3">
              <h2 className="font-semibold text-sm text-ink">{selectedProject.name}</h2>
              <button onClick={() => setSelected(null)} className="text-ink-faint hover:text-ink text-xs">
                &times;
              </button>
            </div>

            {selectedProject.clientName && (
              <p className="text-[11px] text-ink-faint mb-3">{selectedProject.clientName}</p>
            )}

            <div className="space-y-3">
              {/* Status */}
              <div>
                <span className="label mb-1">Status</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: (STATUS_META[selectedProject.status]?.color ?? '#64748b') + '18',
                    color: STATUS_META[selectedProject.status]?.color,
                  }}
                >
                  {STATUS_META[selectedProject.status]?.label}
                </span>
              </div>

              {/* Address */}
              {selectedProject.address && (
                <div>
                  <span className="label mb-1">Address</span>
                  <p className="text-xs text-ink">{selectedProject.address}</p>
                </div>
              )}

              {/* Dates */}
              <div>
                <span className="label mb-1">Timeline</span>
                <p className="text-xs text-ink">
                  {selectedProject.startDate
                    ? format(new Date(selectedProject.startDate), 'd MMM yyyy')
                    : '—'}
                  {' → '}
                  {selectedProject.endDate
                    ? format(new Date(selectedProject.endDate), 'd MMM yyyy')
                    : '—'}
                </p>
              </div>

              {/* Value */}
              {selectedProject.contractValue > 0 && (
                <div>
                  <span className="label mb-1">Contract Value</span>
                  <p className="text-xs text-ink font-mono">
                    ${selectedProject.contractValue.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Progress */}
              {(() => {
                const activities = getProjectActivities(selectedProject)
                if (activities.length === 0) return null
                const done = activities.filter(a => a.status === 'COMPLETED').length
                const pct = Math.round((done / activities.length) * 100)
                return (
                  <div>
                    <span className="label mb-1">Progress</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-ink-faint font-mono">{pct}%</span>
                    </div>
                  </div>
                )
              })()}

              {/* Teams */}
              {(() => {
                const teamNames = getProjectTeams(selectedProject)
                if (teamNames.length === 0) return null
                return (
                  <div>
                    <span className="label mb-1 flex items-center gap-1"><Users className="w-2.5 h-2.5" /> Teams</span>
                    <div className="flex flex-wrap gap-1">
                      {teamNames.map(t => (
                        <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Skills */}
              {(() => {
                const skills = getProjectSkills(selectedProject)
                if (skills.length === 0) return null
                return (
                  <div>
                    <span className="label mb-1">Skills Required</span>
                    <div className="flex flex-wrap gap-1">
                      {skills.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-100 text-ink-muted border border-surface-200/60">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Assets */}
              {(() => {
                const assetIds = getProjectAssetIds(selectedProject)
                const assetNames = assetIds.map(id => assetMap.get(id)).filter(Boolean) as string[]
                if (assetNames.length === 0) return null
                return (
                  <div>
                    <span className="label mb-1 flex items-center gap-1"><Wrench className="w-2.5 h-2.5" /> Assets</span>
                    <div className="flex flex-wrap gap-1">
                      {assetNames.map(n => (
                        <span key={n} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="mt-4 pt-3 border-t border-surface-200">
              <Link href={`/projects/${selectedProject.id}`}>
                <Button variant="primary" size="sm" className="w-full">
                  Open Project
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Timeline slider bar */}
      <div className="px-4 py-3 md:px-6 border-t border-surface-200 bg-surface-50">
        {/* Header row */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => {
              const next = !timelineActive
              setTimelineActive(next)
              if (next && !timelineDate) setTimelineDate(format(new Date(), 'yyyy-MM-dd'))
            }}
            className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors shrink-0 ${
              timelineActive
                ? 'bg-primary text-white'
                : 'bg-surface-100 text-ink-muted hover:text-ink hover:bg-surface-200'
            }`}
          >
            <Calendar className="w-3 h-3" />
            Timeline
          </button>

          {timelineActive && timelineDate && (
            <span className="text-xs font-semibold text-ink">
              {format(new Date(timelineDate), 'EEE, d MMM yyyy')}
            </span>
          )}

          {timelineActive && (
            <button
              onClick={() => {
                setTimelineDate(format(new Date(), 'yyyy-MM-dd'))
              }}
              className="text-[10px] text-primary font-medium px-1.5 hover:underline shrink-0"
            >
              Today
            </button>
          )}

          {/* Team locations summary */}
          {timelineActive && teamLocations.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
              <span className="text-[10px] text-ink-faint shrink-0">Teams:</span>
              {teamLocations.map((loc, i) => (
                <button
                  key={`${loc.teamName}-${loc.projectId}-${i}`}
                  onClick={() => setSelected(loc.projectId)}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors cursor-pointer shrink-0"
                  title={`${loc.teamName} at ${loc.projectName}`}
                >
                  {loc.teamName} → {loc.projectName}
                </button>
              ))}
            </div>
          )}
          {timelineActive && timelineDate && teamLocations.length === 0 && (
            <span className="text-[10px] text-ink-faint">No team activity on this date</span>
          )}
        </div>

        {/* Slider */}
        {timelineActive && (
          <div className="relative">
            {/* Month labels */}
            <div className="relative h-4 mb-1">
              {monthLabels.map((m, i) => (
                <span
                  key={i}
                  className="absolute text-[10px] text-ink-faint font-medium"
                  style={{ left: `${m.pct}%`, transform: 'translateX(-50%)' }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* Slider track */}
            <div className="relative h-8 flex items-center">
              {/* Today marker */}
              <div
                className="absolute top-0 bottom-0 w-px bg-primary/40 z-10"
                style={{ left: `${(todayOffset / dateRange.totalDays) * 100}%` }}
                title="Today"
              />

              <input
                type="range"
                min={0}
                max={dateRange.totalDays}
                step={1}
                value={sliderValue}
                onChange={e => handleSliderChange(Number(e.target.value))}
                className="w-full h-1.5 appearance-none bg-surface-200 rounded-full cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
                  [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
              />
            </div>

            {/* Date range labels */}
            <div className="flex justify-between mt-0.5">
              <span className="text-[10px] text-ink-faint">{format(dateRange.min, 'd MMM yyyy')}</span>
              <span className="text-[10px] text-ink-faint">{format(dateRange.max, 'd MMM yyyy')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
