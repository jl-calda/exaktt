// src/app/(app)/projects/map/ProjectsMapClient.tsx
'use client'
import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { format, isSameDay, isWithinInterval, parseISO, addDays, subDays } from 'date-fns'
import { MapPin, Filter, Calendar, Users, Wrench, ChevronLeft, ChevronRight } from 'lucide-react'
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
    const start = a.startDate ? parseISO(typeof a.startDate === 'string' ? a.startDate : new Date(a.startDate).toISOString()) : null
    const end = a.endDate ? parseISO(typeof a.endDate === 'string' ? a.endDate : new Date(a.endDate).toISOString()) : null
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

  const stepDate = useCallback((days: number) => {
    if (!timelineDate) {
      setTimelineDate(format(new Date(), 'yyyy-MM-dd'))
      return
    }
    const d = days > 0 ? addDays(new Date(timelineDate), days) : subDays(new Date(timelineDate), Math.abs(days))
    setTimelineDate(format(d, 'yyyy-MM-dd'))
  }, [timelineDate])

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

      {/* Timeline bar */}
      <div className="px-4 py-2.5 md:px-6 border-t border-surface-200 bg-surface-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTimelineActive(!timelineActive)
              if (!timelineDate) setTimelineDate(format(new Date(), 'yyyy-MM-dd'))
            }}
            className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${
              timelineActive
                ? 'bg-primary text-white'
                : 'bg-surface-100 text-ink-muted hover:text-ink hover:bg-surface-200'
            }`}
          >
            <Calendar className="w-3 h-3" />
            Timeline
          </button>

          {timelineActive && (
            <>
              <div className="flex items-center gap-1">
                <button onClick={() => stepDate(-1)}
                  className="p-1 rounded hover:bg-surface-100 text-ink-faint hover:text-ink">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <input
                  type="date"
                  value={timelineDate}
                  onChange={e => setTimelineDate(e.target.value)}
                  className="input h-6 text-[11px] text-ink-muted py-0 px-2 w-36"
                />
                <button onClick={() => stepDate(1)}
                  className="p-1 rounded hover:bg-surface-100 text-ink-faint hover:text-ink">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setTimelineDate(format(new Date(), 'yyyy-MM-dd'))}
                  className="text-[10px] text-primary font-medium px-1.5 hover:underline"
                >
                  Today
                </button>
              </div>

              {/* Team locations summary */}
              {teamLocations.length > 0 && (
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
